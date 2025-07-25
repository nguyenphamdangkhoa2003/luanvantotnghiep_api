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
import { faker } from '@faker-js/faker';
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
import * as turf from '@turf/turf';
import { UpdateRouteDto } from '@/modules/routes/DTOs/update-route.dto';
import {
  TripConfirmation,
  TripConfirmationDocument,
} from '@/modules/trip-confirmations/Schemas/trip-confirmation.schema';
interface Location {
  name: string;
  coordinates: [number, number]; // Tuple thay vì number[]
}
@Injectable()
export class RoutesService {
  private readonly mapboxAccessToken: string;
  private readonly REQUEST_EXPIRY_DAYS = 7;
  private readonly EARTH_RADIUS_METERS = 6378100;

  constructor(
    @InjectModel(TripConfirmation.name)
    private readonly tripConfirmationModel: Model<TripConfirmationDocument>,
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
  /**
   * Đơn giản hóa đường đi (path) để giảm số lượng điểm và tối ưu lưu trữ
   * Sử dụng thuật toán Ramer–Douglas–Peucker
   *
   * @param coordinates - Mảng các tọa độ dạng [lng, lat]
   * @param tolerance - Mức độ cho phép sai lệch, càng nhỏ thì giữ càng nhiều điểm
   * @returns Mảng tọa độ sau khi được đơn giản hóa
   */
  private simplifyPath(
    coordinates: [number, number][],
    tolerance: number = 0.001,
  ): [number, number][] {
    const points = coordinates.map(([lng, lat]) => ({ x: lng, y: lat }));
    const simplified = simplify(points, tolerance, true);
    return simplified.map((p) => [p.x, p.y]);
  }

  /**
   * Tài xế tạo tuyến đường mới, bao gồm:
   * - Kiểm tra trùng thời gian với tuyến đang hoạt động
   * - Đơn giản hoá path nếu có
   * - Ghi nhận thông tin tuyến vào database
   *
   * @param userId - ID người tạo tuyến
   * @param createRouteDto - Dữ liệu tuyến nhập vào từ client
   * @returns Tuyến đường đã được lưu
   * @throws BadRequestException nếu có xung đột tuyến hoặc dữ liệu không hợp lệ
   */
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
        startTime,
        endTime,
        ...rest
      } = createRouteDto;

      // 🔍 Kiểm tra trùng thời gian với các tuyến đang hoạt động
      const conflictRoute = await this.routeModel.findOne({
        userId,
        status: 'active',
        $or: [
          {
            startTime: { $lte: startTime },
            endTime: { $gte: startTime },
          },
          {
            startTime: { $lte: endTime },
            endTime: { $gte: endTime },
          },
          {
            startTime: { $gte: startTime },
            endTime: { $lte: endTime },
          },
        ],
      });

      if (conflictRoute) {
        throw new BadRequestException(
          'Bạn đã có một tuyến đường trùng thời gian với tuyến đường này.',
        );
      }

      // 🧭 Map waypoint từ DTO sang schema
      const mappedWaypoints =
        waypoints?.map((waypoint) => {
          if (
            !waypoint.location ||
            typeof waypoint.location.lng !== 'number' ||
            typeof waypoint.location.lat !== 'number'
          ) {
            throw new BadRequestException(
              'Waypoint location phải có lng và lat hợp lệ',
            );
          }

          return {
            coordinates: [waypoint.location.lng, waypoint.location.lat],
            distance: waypoint.distance,
            name: waypoint.name,
            estimatedArrivalTime: waypoint.estimatedArrivalTime ?? null,
          };
        }) || [];

      // 🔽 Đơn giản hoá path nếu có
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

      // 📦 Tạo route mới
      const route = new this.routeModel({
        userId,
        ...rest,
        startTime,
        endTime,
        startPoint: {
          type: 'Point',
          coordinates: [startCoords.lng, startCoords.lat],
        },
        endPoint: {
          type: 'Point',
          coordinates: [endCoords.lng, endCoords.lat],
        },
        waypoints: mappedWaypoints,
        path,
        simplifiedPath,
        distance,
        duration,
        status: 'active',
        routeIndex,
        isNegotiable: rest.isNegotiable ?? false,
      });

      return await route.save();
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      console.log(error);
      throw new InternalServerErrorException('Không thể tạo tuyến đường');
    }
  }

  /**
   * Chuyển đổi khoảng cách từ mét sang radian cho truy vấn MongoDB geospatial
   */
  private metersToRadians(meters: number): number {
    return meters / this.EARTH_RADIUS_METERS;
  }

  /**
   * Tìm kiếm tuyến xe dựa vào vị trí, thời gian, trạng thái, ghế trống, tên tuyến, v.v.
   * Bao gồm cả điều kiện geo-location và query text
   */
  async search(searchRouteDto: SearchRouteDto): Promise<any[]> {
    console.time('search');
    const query = this.buildQuery(searchRouteDto);
    const geoConditions = this.buildOptimizedGeoConditions(searchRouteDto);

    if (geoConditions.length > 0) {
      query.$and = geoConditions;
    }

    const routes = await this.routeModel.find(query).populate('userId').exec();

    const results = await Promise.all(
      routes.map(async (route) => {
        const passengerCount = await this.passengerModel.countDocuments({
          routeId: route._id,
        });

        const pickupDistance = this.computePointToLineDistance(
          searchRouteDto.startCoords,
          route.simplifiedPath,
        );
        const dropoffDistance = this.computePointToLineDistance(
          searchRouteDto.endCoords,
          route.simplifiedPath,
        );

        const totalAllowed =
          (searchRouteDto.maxDistance || 0) + (route.maxPickupDistance || 0);

        if (
          pickupDistance * 1000 <= totalAllowed &&
          dropoffDistance * 1000 <= totalAllowed
        ) {
          return {
            ...route.toObject(),
            passengerCount,
          };
        }
        return null;
      }),
    );
    console.timeEnd('search'); // sẽ log: search: 123.45ms

    return results.filter(Boolean);
  }
  private computePointToLineDistance(
    coords: { lng: number; lat: number } | undefined,
    path: { coordinates: [number, number][] } | undefined,
  ): number {
    if (!coords || !path?.coordinates?.length) return Infinity;
    const pt = turf.point([coords.lng, coords.lat]);
    const line = turf.lineString(path.coordinates);
    return turf.pointToLineDistance(pt, line, { units: 'kilometers' }); // trả về km
  }
  /**
   * Xây dựng điều kiện filter tuyến từ các tham số tìm kiếm text
   */
  private buildQuery({
    name,
    seatsAvailable,
    priceRange,
    status,
    date,
  }: SearchRouteDto): any {
    const query: any = {};

    if (name) {
      query.name = { $regex: name, $options: 'i' };
    }

    if (seatsAvailable !== undefined) {
      query.seatsAvailable = { $gte: seatsAvailable };
    }

    if (priceRange) {
      query.price = {};
      if (priceRange.min !== undefined) query.price.$gte = priceRange.min;
      if (priceRange.max !== undefined) query.price.$lte = priceRange.max;
    }

    if (status) {
      query.status = status;
    }

    if (date) {
      // Lọc theo ngày bắt đầu hoặc điểm đến trong waypoints
      const localStart = new Date(`${date}T00:00:00+07:00`);
      const localEnd = new Date(`${date}T23:59:59+07:00`);
      const start = new Date(localStart.toISOString());
      const end = new Date(localEnd.toISOString());

      query.$or = [
        { startTime: { $gte: start, $lte: end } },
        { 'waypoints.estimatedArrivalTime': { $gte: start, $lte: end } },
      ];
    }

    return query;
  }

  /**
   * Xây dựng điều kiện tìm kiếm không gian (theo geo location)
   * Sử dụng $geoWithin (vòng tròn) và $geoIntersects (với simplifiedPath)
   */
  private buildOptimizedGeoConditions({
    startCoords,
    endCoords,
    maxDistance = 5000,
  }: SearchRouteDto): any[] {
    const maxGlobalPickup = 10000;
    const searchRadius = maxDistance + maxGlobalPickup;

    const geoConditions: any[] = [];

    if (startCoords) {
      geoConditions.push({
        simplifiedPath: {
          $geoIntersects: {
            $geometry: turf.circle(
              [startCoords.lng, startCoords.lat],
              searchRadius / 1000,
              { steps: 64, units: 'kilometers' },
            ).geometry,
          },
        },
      });
    }

    if (endCoords) {
      geoConditions.push({
        simplifiedPath: {
          $geoIntersects: {
            $geometry: turf.circle(
              [endCoords.lng, endCoords.lat],
              searchRadius / 1000,
              { steps: 64, units: 'kilometers' },
            ).geometry,
          },
        },
      });
    }

    return geoConditions;
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
      ownerCarUser.email,
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

        if (action === 'accept') {
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
          route.seatsAvailable -= request.seats;
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

          await this.tripConfirmationModel.create(
            [
              {
                tripRequestId: request._id,
                confirmedByDriver: false,
                confirmedByPassenger: false,
              },
            ],
            { session },
          );

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
      .populate('requestId')
      .exec();
    return passengers.map((passenger) => {
      const user = passenger.userId as any;
      const request = passenger as any;
      return {
        userId: user._id.toString(),
        name: user.name,
        email: user.email,
        request: request,
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

    if (!route) {
      throw new NotFoundException('Route by id: ' + routeId + ' not found');
    }

    // Đếm số lượng hành khách đã tham gia tuyến
    const passengerCount = await this.passengerModel.countDocuments({
      routeId: route._id,
    });

    // Trả về object gồm thông tin route và số hành khách
    return {
      ...route.toObject(),
      passengerCount,
    };
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
    if (request.userId !== userId.toString()) {
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
    if (new Date(route.endTime) < now) {
      throw new BadRequestException(
        'Cancellation is not possible because the trip has already ended.',
      );
    }
    if (new Date(route.startTime) <= now) {
      throw new BadRequestException(
        'You cannot cancel a booking that has already started.',
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
        driverName: driver.name, // thêm dòng này
        routeName: route.name,
        passengerName: request.userId.name,
        cancelDate: new Date().toISOString().split('T')[0],
        loginUrl: 'https://xeshare.com/login',
        supportEmail: 'support@xeshare.com',
      },
    );

    return request;
  }

  async completeTrip(tripRequestId: string, driverId: string) {
    // Tìm request và populate route để lấy userId của tài xế
    const tripRequest = (await this.requestModel
      .findById(tripRequestId)
      .populate('routeId')) as any;

    if (!tripRequest) {
      throw new BadRequestException('Yêu cầu chuyến đi không tồn tại');
    }

    const route = tripRequest.routeId as Route;

    // Chỉ tài xế của route mới được quyền xác nhận hoàn tất chuyến đi
    if (route.userId.toString() !== driverId.toString()) {
      throw new BadRequestException(
        'Bạn không có quyền hoàn tất chuyến đi này (chỉ tài xế mới được phép)',
      );
    }

    if (tripRequest.status !== 'accepted') {
      throw new BadRequestException(
        'Chuyến đi chưa được chấp nhận hoặc đã hoàn thành',
      );
    }

    // Cập nhật trạng thái sang 'completed'
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

      const expectedCompletionTime = new Date(route.endTime);

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

  //================================ *** SEED DATA *** ================================

  async seedFakeRoutes(count: number): Promise<void> {
    try {
      const users = await this.userModel.find().select('_id').lean();
      if (!users.length) {
        throw new Error('Chưa có user nào để gán route');
      }

      const docs: Partial<Route>[] = [];

      for (let i = 0; i < count; i++) {
        const user = users[faker.number.int({ min: 0, max: users.length - 1 })];

        // 1. Tạo điểm start/end
        const startLat = faker.number.float({
          min: 10.6,
          max: 10.9,
          fractionDigits: 4,
        });
        const startLng = faker.number.float({
          min: 106.5,
          max: 106.9,
          fractionDigits: 4,
        });
        const endLat = faker.number.float({
          min: 10.6,
          max: 10.9,
          fractionDigits: 4,
        });
        const endLng = faker.number.float({
          min: 106.5,
          max: 106.9,
          fractionDigits: 4,
        });

        const startPt = turf.point([startLng, startLat]);
        const endPt = turf.point([endLng, endLat]);
        const distKm = turf.distance(startPt, endPt, { units: 'kilometers' });
        const durationSec = (distKm / 30) * 3600;

        // 2. Tạo path và spline
        const rawLine = turf.lineString([
          [startLng, startLat],
          [endLng, endLat],
        ]);
        const pathGeo = turf.bezierSpline(rawLine, { sharpness: 0.7 });

        // 3. Simplify path đúng cách
        const rawCoords = turf.getCoords(pathGeo) as [number, number][];
        const ptsForSimplify = rawCoords.map(([lng, lat]) => ({
          x: lng,
          y: lat,
        }));
        const simplifiedPts = simplify(ptsForSimplify, 0.0001, true);
        const simplifiedCoords = simplifiedPts.length
          ? simplifiedPts.map((p) => [p.x, p.y] as [number, number])
          : rawCoords; // fallback nếu simplify trả về rỗng

        // 4. Sinh waypoint
        const numWP = faker.number.int({ min: 0, max: 3 });
        const waypoints = Array.from({ length: numWP }).map(() => {
          const frac = faker.number.float({
            min: 0.1,
            max: 0.9,
            fractionDigits: 2,
          });
          const pt = turf.along(rawLine, frac * distKm, {
            units: 'kilometers',
          });
          const [lng, lat] = turf.getCoords(pt) as [number, number];
          return {
            name: faker.location.city(), // dùng module location
            distance: parseFloat((frac * distKm).toFixed(2)),
            coordinates: [lng, lat] as [number, number],
            estimatedArrivalTime: new Date(
              Date.now() + frac * durationSec * 1000,
            ),
          };
        });

        // 5. Thời gian bắt đầu + kết thúc
        const startTime = faker.date.soon({ days: 30 });
        const endTime = new Date(startTime.getTime() + durationSec * 1000);

        docs.push({
          userId: user._id.toString(),
          name: faker.company.catchPhrase(),
          startPoint: { type: 'Point', coordinates: [startLng, startLat] },
          endPoint: { type: 'Point', coordinates: [endLng, endLat] },
          path: { type: 'LineString', coordinates: rawCoords },
          simplifiedPath: { type: 'LineString', coordinates: simplifiedCoords },
          distance: parseFloat(distKm.toFixed(2)),
          duration: Math.round(durationSec),
          startTime,
          endTime,
          seatsAvailable: faker.number.int({ min: 1, max: 7 }),
          price: faker.number.int({ min: 50, max: 200 }) * 1000,
          status: 'active',
          routeIndex: i,
          waypoints,
          maxPickupDistance: 5,
          isNegotiable: faker.datatype.boolean(),
        });
      }

      await this.routeModel.insertMany(docs);
      console.log(`✅ Đã tạo xong ${count} routes ảo.`);
    } catch (err) {
      console.error(err);
      throw new InternalServerErrorException('Seed routes thất bại');
    }
  }

  //================================ *** SEED DATA *** ================================

  async getRoutesByDriver(userId: string): Promise<Route[]> {
    const routes = await this.routeModel.find({ userId }).exec();

    if (!routes || routes.length === 0) {
      throw new NotFoundException(
        `No routes found for driver with ID: ${userId}`,
      );
    }

    return routes;
  }

  async getRequestsByDriverId(driverId: string): Promise<any[]> {
    try {
      // 1. Lấy tất cả route mà tài xế đã tạo
      const routes = await this.routeModel
        .find({ userId: driverId }, { _id: 1 })
        .exec();

      if (!routes || routes.length === 0) {
        throw new NotFoundException(
          `No routes found for driver with ID ${driverId}`,
        );
      }

      const routeIds = routes.map((route) => route._id);

      // 2. Lấy các request có routeId thuộc danh sách route
      const requests = await this.requestModel
        .find({ routeId: { $in: routeIds } })
        .populate('userId', 'name email') // populate người gửi yêu cầu
        .populate('routeId') // populate thông tin route
        .exec();

      if (!requests || requests.length === 0) {
        throw new NotFoundException(
          `No requests found for driver with ID ${driverId}`,
        );
      }

      // 3. Gắn passengerCount cho mỗi request
      const enrichedRequests = await Promise.all(
        requests.map(async (req) => {
          const route = req.routeId as any; // 👈 ép kiểu rõ ràng
          const passengerCount = await this.passengerModel.countDocuments({
            routeId: route._id, // ✅ bây giờ route._id là hợp lệ
          });

          return {
            ...req.toObject(),
            passengerCount,
          };
        }),
      );

      return enrichedRequests;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch requests');
    }
  }

  async getRoutesByPassenger(userId: string): Promise<Route[]> {
    try {
      const requests = await this.requestModel
        .find({
          userId,
          status: { $in: [RequestStatus.ACCEPTED, RequestStatus.COMPLETED] },
        })
        .select('routeId')
        .exec();

      // Trả về mảng rỗng nếu không có request
      if (!requests || requests.length === 0) {
        return [];
      }

      const routeIds = requests.map((req) => req.routeId);
      const routes = await this.routeModel
        .find({ _id: { $in: routeIds } })
        .populate('userId', 'name email')
        .exec();

      return routes || [];
    } catch (error) {
      console.error(`Lỗi khi lấy routes cho passenger ${userId}:`, error);
      throw new InternalServerErrorException(
        'Không thể lấy danh sách tuyến đường',
      );
    }
  }

  // routes.service.ts
  async getRequestsByUserId(userId: string): Promise<Request[]> {
    try {
      const requests = await this.requestModel
        .find({ userId })
        .populate('userId', 'name email')
        .populate('routeId', 'name userId status')
        .exec();
      return requests || [];
    } catch (error) {
      console.error(`Lỗi khi lấy requests cho user ${userId}:`, error);
      throw new InternalServerErrorException('Không thể lấy danh sách yêu cầu');
    }
  }

  async getBookinHistory(userId: string) {
    try {
      const booking = await this.passengerModel
        .find({
          userId,
        })
        .populate('userId')
        .populate({
          path: 'routeId',
          populate: [{ path: 'userId' }],
        })
        .populate('requestId')
        .exec();
      return booking || [];
    } catch (error) {
      console.error('Lỗi khi lấy lịch sử đặt chuyến đi');
    }
  }

  async updateRoute(
    userId: string,
    routeId: string,
    dto: UpdateRouteDto,
  ): Promise<Route> {
    const route = await this.routeModel.findById(routeId);
    if (!route) {
      throw new NotFoundException('Route not found');
    }

    if (route.userId.toString() !== userId) {
      throw new ForbiddenException(
        'You do not have permission to edit this route',
      );
    }

    // Không cho sửa nếu chuyến đã bắt đầu
    if (new Date(route.startTime) <= new Date()) {
      throw new BadRequestException(
        'Cannot update a route that has already started',
      );
    }

    // Không cho sửa nếu đã có hành khách
    const passengerCount = await this.passengerModel.countDocuments({
      routeId: route._id,
    });
    if (passengerCount > 0) {
      throw new BadRequestException(
        'Cannot update a route that already has passengers',
      );
    }

    // Lấy các giá trị mới hoặc giữ nguyên nếu không có
    const {
      startTime = route.startTime,
      endTime = route.endTime,
      startCoords = route.startPoint?.coordinates && {
        lng: route.startPoint.coordinates[0],
        lat: route.startPoint.coordinates[1],
      },
      endCoords = route.endPoint?.coordinates && {
        lng: route.endPoint.coordinates[0],
        lat: route.endPoint.coordinates[1],
      },
      path = route.path,
      waypoints = route.waypoints,
      ...rest
    } = dto as any; // dùng any nếu DTO chưa đầy đủ các thuộc tính

    // Kiểm tra xung đột tuyến
    const conflictRoute = await this.routeModel.findOne({
      _id: { $ne: routeId },
      userId,
      status: 'active',
      $or: [
        {
          startTime: { $lte: startTime },
          endTime: { $gte: startTime },
        },
        {
          startTime: { $lte: endTime },
          endTime: { $gte: endTime },
        },
        {
          startTime: { $gte: startTime },
          endTime: { $lte: endTime },
        },
      ],
    });

    if (conflictRoute) {
      throw new BadRequestException(
        'Bạn đã có một tuyến đường trùng thời gian với tuyến đường này.',
      );
    }

    // Đảm bảo thời gian hợp lệ
    if (endTime <= startTime) {
      throw new BadRequestException('endTime must be greater than startTime');
    }

    // Xử lý waypoint nếu có
    let mappedWaypoints = route.waypoints;
    if (waypoints) {
      mappedWaypoints = waypoints.map((waypoint) => {
        if (
          !waypoint.location ||
          typeof waypoint.location.lng !== 'number' ||
          typeof waypoint.location.lat !== 'number'
        ) {
          throw new BadRequestException(
            'Waypoint location phải có lng và lat hợp lệ',
          );
        }
        return {
          coordinates: [waypoint.location.lng, waypoint.location.lat],
          distance: waypoint.distance,
          name: waypoint.name,
          estimatedArrivalTime: waypoint.estimatedArrivalTime ?? null, // cập nhật
        };
      });
    }

    // Rút gọn path nếu có
    let simplifiedPath = path;
    if (path?.coordinates) {
      simplifiedPath = {
        ...path,
        coordinates: this.simplifyPath(path.coordinates as [number, number][]),
      };
      console.log(
        `Path reduced from ${path.coordinates.length} to ${simplifiedPath.coordinates.length} points`,
      );
    }

    // Gán lại toàn bộ giá trị
    Object.assign(route, {
      ...rest,
      startTime,
      endTime,
      startPoint: startCoords && {
        type: 'Point',
        coordinates: [startCoords.lng, startCoords.lat],
      },
      endPoint: endCoords && {
        type: 'Point',
        coordinates: [endCoords.lng, endCoords.lat],
      },
      waypoints: mappedWaypoints,
      path,
      simplifiedPath,
    });

    return await route.save();
  }

  async deleteRoute(
    userId: string,
    routeId: string,
  ): Promise<{ message: string }> {
    const route = await this.routeModel.findById(routeId);
    if (!route) throw new NotFoundException('Route not found');

    if (route.userId.toString() !== userId) {
      throw new ForbiddenException(
        'You do not have permission to delete this route',
      );
    }

    if (new Date(route.startTime) <= new Date()) {
      throw new BadRequestException(
        'Cannot delete a route that has already started',
      );
    }

    // Kiểm tra xem đã có hành khách tham gia chưa
    const requests = await this.requestModel.find({
      routeId: route._id,
      status: { $in: ['accepted', 'completed'] },
    });

    if (requests.length > 0) {
      throw new BadRequestException(
        'Cannot delete route with existing accepted passengers',
      );
    }

    await this.routeModel.findByIdAndDelete(routeId);
    await this.requestModel.deleteMany({ routeId });

    return { message: 'Route deleted successfully' };
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT) // hoặc EVERY_DAY_AT_1AM
  async expirePastRoutes(): Promise<void> {
    const now = new Date();

    const result = await this.routeModel.updateMany(
      {
        endTime: { $lt: now },
        status: { $ne: 'expired' }, // Chỉ cập nhật những route chưa hết hạn
      },
      {
        $set: { status: 'expired' },
      },
    );

    console.log(
      `✅ Đã cập nhật ${result.modifiedCount} tuyến đường hết hạn vào ${now.toISOString()}`,
    );
  }
}
