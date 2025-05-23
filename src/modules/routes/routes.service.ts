import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import axios from 'axios';
import { Route, RouteDocument } from '@/modules/routes/schemas/routes.schema';
import { CreateRouteDto } from '@/modules/routes/DTOs/create-route.dto';
import { SearchRouteDto } from '@/modules/routes/DTOs/search-route.dto';
import { ConfigService } from '@nestjs/config';
import { AdvancedSearchRouteDto } from '@/modules/routes/DTOs/advanced-search-route.dto';
import {
  Request,
  RequestDocument,
} from '@/modules/routes/schemas/request.schema';
import { NotificationService } from '@/modules/routes/notification.service';
import { RequestRouteDto } from '@/modules/routes/DTOs/request-route.dto';
import { User, UserDocument } from '@/modules/users/schemas/user.schema';
import { MailService } from '@/modules/mail/mail.service';
import { HandleRequestDto } from '@/modules/routes/DTOs/handle-request.dto';
import { RequestStatus } from '@/common/enums/request-status.enum';
import {
  Passenger,
  PassengerDocument,
} from '@/modules/routes/schemas/Passenger.schema';
import { GetPassengersDto } from '@/modules/routes/DTOs/get-passengers.dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ChatService } from '@/modules/chat/chat.service';
import { MembershipService } from '@/modules/membership/membership.service';
import { MembershipPackageType } from '@/common/enums/membership-package-type.enum';
import { CancelRequestDto } from '@/modules/routes/DTOs/cancel-request.dto';
import simplify from 'simplify-js';

@Injectable()
export class RoutesService {
  private readonly mapboxAccessToken: string;
  private readonly REQUEST_EXPIRY_DAYS = 7;
  private readonly EARTH_RADIUS_METERS = 6378100;

  constructor(
    @InjectModel(Route.name) private routeModel: Model<RouteDocument>,
    @InjectModel(Request.name) private requestModel: Model<RequestDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Passenger.name)
    private passengerModel: Model<PassengerDocument>,
    private readonly configService: ConfigService,
    private membershipService: MembershipService,
    private notificationService: NotificationService,
    private mailService: MailService,
    private chatService: ChatService,
  ) {
    this.mapboxAccessToken = configService.getOrThrow<string>(
      'mapbox_access_token',
    );
  }
  private simplifyPath(
    coordinates: [number, number][],
    tolerance: number = 0.001,
  ): [number, number][] {
    const points = coordinates.map(([lng, lat]) => ({ x: lng, y: lat }));
    const simplified = simplify(points, tolerance, true); // true: giữ chất lượng cao
    return simplified.map((p) => [p.x, p.y]);
  }

  async create(userId: string, createRouteDto: CreateRouteDto): Promise<Route> {
    try {
      const {
        startAddress,
        startCoords,
        endAddress,
        endCoords,
        waypoints,
        routeIndex = 0,
        path,
        distance,
        duration,
        ...rest
      } = createRouteDto;

      // Rút gọn path nếu có
      let simplifiedPath = path;
      if (path?.coordinates) {
        simplifiedPath = {
          ...path,
          coordinates: this.simplifyPath(
            path.coordinates as [number, number][],
          ),
        };
        console.log(
          `Path reduced from ${path.coordinates.length} to ${simplifiedPath.coordinates.length} points`,
        );
      }

      const route = new this.routeModel({
        userId,
        ...rest,
        startPoint: {
          type: 'Point',
          coordinates: [startCoords.lng, startCoords.lat],
        },
        endPoint: {
          type: 'Point',
          coordinates: [endCoords.lng, endCoords.lat],
        },
        waypoints,
        path: simplifiedPath,
        distance,
        duration,
        status: 'active',
        routeIndex,
      });

      return await route.save();
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      console.log(error);
      throw new InternalServerErrorException('Failed to create route');
    }
  }

  private metersToRadians(meters: number): number {
    return meters / this.EARTH_RADIUS_METERS;
  }

  private buildGeoWithinQuery(
    coords: { lng: number; lat: number },
    maxDistance: number,
  ): any {
    return {
      $geoWithin: {
        $centerSphere: [
          [coords.lng, coords.lat],
          this.metersToRadians(maxDistance),
        ],
      },
    };
  }

  async search(searchRouteDto: SearchRouteDto): Promise<Route[]> {
    const {
      startCoords,
      endCoords,
      maxDistance = 5000,
      date,
      name,
      frequency,
      seatsAvailable,
      priceRange,
      status,
      page = 0,
      limit = 10,
    } = searchRouteDto;

    if (
      priceRange &&
      priceRange.min &&
      priceRange.max &&
      priceRange.min > priceRange.max
    ) {
      throw new BadRequestException(
        'priceRange.min must be less than or equal to priceRange.max',
      );
    }

    const query: any = {};
    const orConditions: any[] = [];
    if (date) {
      const startOfDay = new Date(date);
      const endOfDay = new Date(startOfDay.setHours(23, 59, 59));
      query.startTime = { $gte: startOfDay, $lte: endOfDay };
    }
    if (startCoords) {
      const geoQuery = this.buildGeoWithinQuery(startCoords, maxDistance);
      orConditions.push(
        { startPoint: geoQuery },
        { waypoints: geoQuery },
        { path: geoQuery },
      );
    }
    if (endCoords) {
      const geoQuery = this.buildGeoWithinQuery(endCoords, maxDistance);
      orConditions.push(
        { endPoint: geoQuery },
        { waypoints: geoQuery },
        { path: geoQuery },
      );
    }
    if (orConditions.length > 0) {
      query.$or = orConditions;
    }
    if (name) {
      query.name = { $regex: `^${name}`, $options: 'i' };
    }
    if (frequency) {
      query.frequency = frequency;
    }
    if (seatsAvailable !== undefined) {
      query.seatsAvailable = { $gte: seatsAvailable };
    }
    if (priceRange) {
      query.price = {};
      if (priceRange.min !== undefined) {
        query.price.$gte = priceRange.min;
      }
      if (priceRange.max !== undefined) {
        query.price.$lte = priceRange.max;
      }
    }
    if (status) {
      query.status = status;
    }

    return await this.routeModel
      .find(query)
      .populate('userId')
      .skip(page * limit)
      .limit(limit)
      .lean()
      .exec();
  }

  async requestRoute(
    user: User,
    requestRouteDto: RequestRouteDto,
  ): Promise<Request> {
    const { routeId, message, seats } = requestRouteDto;

    // Kiểm tra tuyến đường tồn tại
    const route = await this.routeModel.findById(routeId).exec();
    if (!route) {
      throw new NotFoundException('Route not found');
    }

    const ownerCarUser = await this.userModel.findById(
      new Types.ObjectId(route.userId),
    );
    if (!ownerCarUser) throw new InternalServerErrorException();
    if (seats > route.seatsAvailable) {
      throw new BadRequestException(`Only ${route.seatsAvailable} seat left`);
    }
    // Tạo yêu cầu tham gia
    const request = new this.requestModel({
      userId: user._id,
      routeId,
      status: RequestStatus.PENDING,
      message,
      seats,
    });
    await request.save();

    // Tạo thông báo in-app
    const notificationMessage = `User ${user._id} has requested to join your route: ${route.name}. Message: ${message || 'No message'}`;
    await this.notificationService.createNotification(
      route.userId,
      request.id,
      notificationMessage,
    );

    await this.mailService.sendMail(
      user.email,
      'New Route Join Request',
      'route-request-email',
      {
        routeName: route.name,
        ownerName: ownerCarUser.name,
        requesterName: user.name,
        message: message || 'No message',
        requestDate: request.createdAt.toISOString().split('T')[0],
        loginUrl: 'https://xeshare.com/login',
        supportEmail: 'support@xeshare.com',
      },
    );

    return request;
  }

  async handleRequest(
    user: User,
    handleRequestDto: HandleRequestDto,
  ): Promise<Request> {
    const { requestId, action, reason } = handleRequestDto;
    const session = await this.requestModel.db.startSession();

    try {
      return await session.withTransaction(async () => {
        // Tìm yêu cầu
        const request = await this.requestModel
          .findById(requestId)
          .session(session)
          .exec();
        if (!request) {
          throw new NotFoundException('Request not found');
        }

        // Tìm tuyến đường
        const route = await this.routeModel
          .findById(request.routeId)
          .session(session)
          .exec();
        if (!route) {
          throw new NotFoundException('Route not found');
        }

        // Kiểm tra quyền: Chỉ chủ xe được xử lý
        if (route.userId !== user._id.toString()) {
          throw new ForbiddenException(
            'You are not authorized to handle this request',
          );
        }

        // Kiểm tra trạng thái yêu cầu
        if (request.status !== RequestStatus.PENDING) {
          throw new ForbiddenException('Request has already been processed');
        }

        const requestUser = await this.userModel
          .findById(new Types.ObjectId(request.userId))
          .session(session)
          .exec();
        if (!requestUser) throw new NotFoundException('User request not found');

        // Xử lý hành động
        if (action === 'accept') {
          // Kiểm tra gói thành viên
          const membership = await this.membershipService.getMembershipInfo(
            user._id.toString(),
          );
          if (!membership || membership.endDate! < new Date()) {
            throw new BadRequestException('No active membership');
          }
          if (
            membership.remainingRequests <= 0 &&
            membership.packageType !== MembershipPackageType.PRO
          ) {
            throw new BadRequestException(
              'No remaining accept requests. Please upgrade your membership.',
            );
          }

          // Cập nhật trạng thái yêu cầu
          request.status = RequestStatus.ACCEPTED;

          // Giảm số ghế trống
          if (route.seatsAvailable <= 0) {
            throw new ForbiddenException('No seats available');
          }
          route.seatsAvailable -= 1;
          await route.save({ session });

          // Trừ lượt chấp nhận (nếu không phải gói Pro)
          if (membership.packageType !== MembershipPackageType.PRO) {
            await this.userModel.updateOne(
              { _id: user._id },
              { $inc: { 'currentMembership.remainingRequests': -1 } },
              { session },
            );
          }

          const passenger = new this.passengerModel({
            userId: request.userId,
            routeId: request.routeId,
            requestId: request._id,
          });
          await passenger.save({ session });

          // Gửi thông báo in-app
          const message = `Your request to join route "${route.name}" has been accepted.`;
          await this.notificationService.createNotification(
            request.userId,
            request.id,
            message,
          );

          // Gửi email
          await this.mailService.sendMail(
            requestUser.email,
            'Request Accepted',
            `accept-request`,
            {
              requesterName: requestUser?.name,
              routeName: route.name,
              startTime: route.startTime,
              price: route.price,
              ownerEmail: user.email,
              appUrl: 'https://xeshare.com/',
            },
          );
          await this.chatService.createConversation(
            requestId,
            route.userId,
            request.userId,
            request.routeId,
          );
        } else if (action === 'reject') {
          request.status = RequestStatus.REJECTED;

          const message = `Your request to join route "${route.name}" has been rejected.`;
          await this.notificationService.createNotification(
            request.userId,
            request.id,
            message,
          );

          // Gửi email
          await this.mailService.sendMail(
            requestUser.email,
            'Request Rejected',
            'reject-request',
            {
              requesterName: requestUser.name,
              routeName: route.name,
              reason,
            },
          );
        }

        // Lưu yêu cầu đã cập nhật
        return request.save({ session });
      });
    } catch (error) {
      throw error; // Ném lỗi để NestJS xử lý
    } finally {
      session.endSession(); // Đảm bảo session được đóng
    }
  }

  async getPassengers(
    userId: string,
    getPassengersDto: GetPassengersDto,
  ): Promise<any[]> {
    const { routeId } = getPassengersDto;

    // Kiểm tra tuyến đường
    const route = await this.routeModel.findById(routeId).exec();
    if (!route) {
      throw new NotFoundException('Route not found');
    }

    // Kiểm tra quyền
    if (route.userId !== userId.toString()) {
      throw new ForbiddenException(
        'You are not authorized to view passengers for this route',
      );
    }

    // Lấy danh sách hành khách
    const passengers = await this.passengerModel
      .find({ routeId })
      .populate('userId', 'name email')
      .populate('requestId', 'message createdAt')
      .exec();
    console.log(passengers);
    return passengers.map((passenger) => {
      const user = passenger.userId as any;
      const request = passenger as any;
      console.log('user', user);
      console.log('request', request);
      return {
        userId: user._id.toString(),
        name: user.name,
        email: user.email,
        requestId: request._id.toString(),
        message: request.message,
        createdAt: request.createdAt,
      };
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async autoRejectExpiredRequests(): Promise<void> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() - this.REQUEST_EXPIRY_DAYS);

    // Tìm các yêu cầu pending quá hạn
    const expiredRequests = await this.requestModel
      .find({
        status: RequestStatus.PENDING,
        createdAt: { $lte: expiryDate },
      })
      .exec();

    for (const request of expiredRequests) {
      const route = await this.routeModel.findById(request.routeId).exec();
      if (!route) {
        continue;
      }

      request.status = RequestStatus.REJECTED;
      await request.save();

      const message = `Your request to join route "${route.name}" has been automatically rejected due to no response after ${this.REQUEST_EXPIRY_DAYS} days.`;
      await this.notificationService.createNotification(
        request.userId,
        request.id,
        message,
      );

      // Gửi email
      const userId = request.userId;
      const requester = await this.userModel.findById(userId);
      if (!requester)
        throw new NotFoundException(`User not found by id: ${userId}`);
      await this.mailService.sendMail(
        requester.email,
        'Request Automatically Rejected',
        'reject-request',
        {
          requesterName: requester.name,
          routeName: route.name,
          reason: `Your request to join route "${route.name}" has been automatically rejected because it was not processed within ${this.REQUEST_EXPIRY_DAYS} days. Please check other routes.`,
        },
      );
    }
  }

  public async getRouteById(routeId: string) {
    const route = await this.routeModel
      .findById(routeId)
      .populate('userId')
      .exec();
    if (!route)
      return new NotFoundException('Route by id: ' + routeId + ' not found');
    return route;
  }

  async cancelBooking(
    userId: string,
    cancelBookingDto: CancelRequestDto,
  ): Promise<Request> {
    const { requestId } = cancelBookingDto;

    // Tìm yêu cầu đặt chỗ
    const request = (await this.requestModel
      .findById(requestId)
      .populate('routeId')
      .exec()) as any;

    if (!request) {
      throw new NotFoundException('No booking request found.');
    }

    // Kiểm tra xem hành khách có phải là người tạo yêu cầu không
    if (request.userId.toString() !== userId) {
      throw new BadRequestException(
        'You do not have the right to cancel this request.',
      );
    }

    if (request.status === RequestStatus.CANCELLED) {
      throw new BadRequestException('The request was previously canceled.');
    }
    if (request.status === RequestStatus.REJECTED) {
      throw new BadRequestException(
        'The request has been denied and cannot be cancelled.',
      );
    }

    // Kiểm tra thời gian khởi hành
    const route = request.routeId as Route;
    const now = new Date();
    if (new Date(route.startTime) < now) {
      throw new BadRequestException(
        'Cancellation is not possible because the trip has started or ended.',
      );
    }

    // Cập nhật trạng thái thành 'cancelled'
    request.status = RequestStatus.CANCELLED;
    request.updatedAt = new Date();
    await request.save();

    const driver = await this.userModel
      .findById(new Types.ObjectId(route.userId))
      .exec();
    if (!driver) {
      throw new InternalServerErrorException('Driver not found.');
    }

    // Tạo thông báo in-app cho tài xế
    const notificationMessage = `Passenger ${request.userId.name} has canceled the request to join the route: ${route.name}.`;
    await this.notificationService.createNotification(
      route.userId,
      request.id,
      notificationMessage,
    );

    // Gửi email thông báo cho tài xế
    await this.mailService.sendMail(
      driver.email,
      'Reservation Request Cancelled',
      'booking-cancelled',
      {
        routeName: route.name,
        passengerName: request.userId.name,
        cancelDate: new Date().toISOString().split('T')[0],
        loginUrl: 'https://xeshare.com/login',
        supportEmail: 'support@xeshare.com',
      },
    );

    return request;
  }

  async completeTrip(tripRequestId: string, userId: string) {
    const tripRequest = (await this.requestModel
      .findById(tripRequestId)
      .populate('routeId')) as any;

    if (!tripRequest) {
      throw new BadRequestException('Yêu cầu chuyến đi không tồn tại');
    }
    tripRequest.routeId = tripRequest.routeId as Route;

    if (
      tripRequest.userId.toString() !== userId &&
      tripRequest.routeId.userId.toString() !== userId
    ) {
      throw new BadRequestException(
        'You are not authorized to confirm this trip.',
      );
    }

    if (tripRequest.status !== 'accepted') {
      throw new BadRequestException(
        'Chuyến đi chưa được chấp nhận hoặc đã hoàn thành',
      );
    }

    tripRequest.status = 'completed';
    tripRequest.completedAt = new Date();
    await tripRequest.save();

    return tripRequest;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async autoCompleteTrips() {
    const now = new Date();

    // Tìm tất cả các Request có status = 'accepted'
    const acceptedRequests = (await this.requestModel
      .find({ status: 'accepted' })
      .populate('routeId')) as any; // Populate để lấy thông tin Route

    for (const request of acceptedRequests) {
      const route = request.routeId as Route;

      if (!route) {
        continue;
      }

      const durationInMs = route.duration * 60 * 1000;
      const expectedCompletionTime = new Date(
        new Date(route.startTime).getTime() + durationInMs,
      );

      if (now > expectedCompletionTime) {
        await this.requestModel.updateOne(
          { _id: request._id },
          {
            status: 'completed',
            completedAt: now,
          },
        );
      }
    }
  }
}
