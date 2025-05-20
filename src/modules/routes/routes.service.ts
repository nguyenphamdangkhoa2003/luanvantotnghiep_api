import {
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

@Injectable()
export class RoutesService {
  private readonly mapboxAccessToken: string;
  private readonly REQUEST_EXPIRY_DAYS = 7;

  constructor(
    @InjectModel(Route.name) private routeModel: Model<RouteDocument>,
    @InjectModel(Request.name) private requestModel: Model<RequestDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Passenger.name)
    private passengerModel: Model<PassengerDocument>,
    private readonly configService: ConfigService,
    private notificationService: NotificationService,
    private mailService: MailService,
    private chatService: ChatService,
  ) {
    this.mapboxAccessToken = configService.getOrThrow<string>(
      'mapbox_access_token',
    );
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
        path,
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
    } = searchRouteDto;

    const query: any = {};
    const orConditions: any[] = [];

    if (date) {
      query.startTime = {
        $gte: new Date(date),
        $lte: new Date(new Date(date).setHours(23, 59, 59)),
      };
    }

    const metersToRadians = (meters: number) => meters / 6378100;

    if (startCoords) {
      orConditions.push(
        {
          startPoint: {
            $geoWithin: {
              $centerSphere: [
                [startCoords.lng, startCoords.lat],
                metersToRadians(maxDistance),
              ],
            },
          },
        },
        {
          waypoints: {
            $geoWithin: {
              $centerSphere: [
                [startCoords.lng, startCoords.lat],
                metersToRadians(maxDistance),
              ],
            },
          },
        },
        {
          path: {
            $geoWithin: {
              $centerSphere: [
                [startCoords.lng, startCoords.lat],
                metersToRadians(maxDistance),
              ],
            },
          },
        },
      );
    }

    if (endCoords) {
      orConditions.push(
        {
          endPoint: {
            $geoWithin: {
              $centerSphere: [
                [endCoords.lng, endCoords.lat],
                metersToRadians(maxDistance),
              ],
            },
          },
        },
        {
          waypoints: {
            $geoWithin: {
              $centerSphere: [
                [endCoords.lng, endCoords.lat],
                metersToRadians(maxDistance),
              ],
            },
          },
        },
        {
          path: {
            $geoWithin: {
              $centerSphere: [
                [endCoords.lng, endCoords.lat],
                metersToRadians(maxDistance),
              ],
            },
          },
        },
      );
    }

    if (orConditions.length > 0) {
      query.$or = orConditions; // Thay $and bằng $or để tránh xung đột
    }

    if (name) {
      query.name = { $regex: name, $options: 'i' };
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

    return this.routeModel.find(query).exec();
  }

  async requestRoute(
    user: User,
    requestRouteDto: RequestRouteDto,
  ): Promise<Request> {
    const { routeId, message } = requestRouteDto;

    // Kiểm tra tuyến đường tồn tại
    const route = await this.routeModel.findById(routeId).exec();
    if (!route) {
      throw new NotFoundException('Route not found');
    }

    const ownerCarUser = await this.userModel.findById(
      new Types.ObjectId(route.userId),
    );
    if (!ownerCarUser) throw new InternalServerErrorException();
    // Tạo yêu cầu tham gia
    const request = new this.requestModel({
      userId: user._id,
      routeId,
      status: 'pending',
      message,
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
        if (action === RequestStatus.ACCEPT) {
          // Cập nhật trạng thái yêu cầu
          request.status = 'accepted';

          // Giảm số ghế trống
          if (route.seatsAvailable <= 0) {
            throw new ForbiddenException('No seats available');
          }
          route.seatsAvailable -= 1;
          await route.save({ session });

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
          request.status = 'rejected';

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
        status: 'pending',
        createdAt: { $lte: expiryDate },
      })
      .exec();

    for (const request of expiredRequests) {
      const route = await this.routeModel.findById(request.routeId).exec();
      if (!route) {
        continue;
      }

      request.status = 'rejected';
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
}
