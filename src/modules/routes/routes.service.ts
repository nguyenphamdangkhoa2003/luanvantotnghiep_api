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
  private readonly locations: Location[] = [
    { name: 'Hà Nội', coordinates: [105.8342, 21.0278] },
    { name: 'TP Hồ Chí Minh', coordinates: [106.6297, 10.8231] },
    { name: 'Đà Nẵng', coordinates: [108.2068, 16.0472] },
    { name: 'Huế', coordinates: [107.5898, 16.4637] },
    { name: 'Cần Thơ', coordinates: [105.7747, 10.0386] },
    { name: 'Nha Trang', coordinates: [109.1942, 12.2451] },
    { name: 'Hải Phòng', coordinates: [106.6881, 20.8449] },
    { name: 'Vũng Tàu', coordinates: [107.0843, 10.346] },
    { name: 'Đà Lạt', coordinates: [108.4419, 11.9404] },
    { name: 'Quảng Ninh', coordinates: [107.0571, 20.9517] },
    { name: 'An Giang', coordinates: [105.4352, 10.5215] },
    { name: 'Bà Rịa - Vũng Tàu', coordinates: [107.1688, 10.4963] },
    { name: 'Bắc Giang', coordinates: [106.1947, 21.2731] },
    { name: 'Bắc Kạn', coordinates: [105.8403, 22.147] },
    { name: 'Bạc Liêu', coordinates: [105.7244, 9.294] },
    { name: 'Bắc Ninh', coordinates: [106.0502, 21.1861] },
    { name: 'Bến Tre', coordinates: [106.3756, 10.2415] },
    { name: 'Bình Định', coordinates: [109.2335, 13.782] },
    { name: 'Bình Dương', coordinates: [106.677, 11.152] },
    { name: 'Bình Phước', coordinates: [106.8934, 11.5379] },
    { name: 'Bình Thuận', coordinates: [108.1021, 10.9289] },
    { name: 'Cà Mau', coordinates: [105.1524, 9.1768] },
    { name: 'Cao Bằng', coordinates: [106.2524, 22.666] },
    { name: 'Đắk Lắk', coordinates: [108.2378, 12.71] },
    { name: 'Đắk Nông', coordinates: [107.6097, 12.264] },
    { name: 'Điện Biên', coordinates: [103.0167, 21.386] },
    { name: 'Đồng Nai', coordinates: [107.1007, 10.9574] },
    { name: 'Đồng Tháp', coordinates: [105.6877, 10.4938] },
    { name: 'Gia Lai', coordinates: [108.269, 13.8079] },
    { name: 'Hà Giang', coordinates: [104.9836, 22.8233] },
    { name: 'Hà Nam', coordinates: [105.9122, 20.5835] },
    { name: 'Hà Tĩnh', coordinates: [105.9057, 18.3428] },
    { name: 'Hải Dương', coordinates: [106.333, 20.941] },
    { name: 'Hậu Giang', coordinates: [105.6413, 9.7579] },
    { name: 'Hòa Bình', coordinates: [105.3383, 20.8172] },
    { name: 'Hưng Yên', coordinates: [106.0672, 20.8526] },
    { name: 'Khánh Hòa', coordinates: [109.1927, 12.2584] },
    { name: 'Kiên Giang', coordinates: [105.1259, 10.0124] },
    { name: 'Kon Tum', coordinates: [108.0133, 14.6612] },
    { name: 'Lai Châu', coordinates: [103.4371, 22.3857] },
    { name: 'Lâm Đồng', coordinates: [108.4587, 11.5753] },
    { name: 'Lạng Sơn', coordinates: [106.6291, 21.8537] },
    { name: 'Lào Cai', coordinates: [103.9743, 22.4832] },
    { name: 'Long An', coordinates: [106.4111, 10.6987] },
    { name: 'Nam Định', coordinates: [106.1753, 20.42] },
    { name: 'Nghệ An', coordinates: [105.6927, 19.2342] },
    { name: 'Ninh Bình', coordinates: [105.9747, 20.2581] },
    { name: 'Ninh Thuận', coordinates: [108.9929, 11.6739] },
    { name: 'Phú Thọ', coordinates: [105.2221, 21.3992] },
    { name: 'Phú Yên', coordinates: [109.296, 13.0882] },
    { name: 'Quảng Bình', coordinates: [106.6222, 17.4651] },
    { name: 'Quảng Nam', coordinates: [108.019, 15.879] },
    { name: 'Quảng Ngãi', coordinates: [108.7992, 15.1214] },
    { name: 'Quảng Trị', coordinates: [107.2007, 16.7943] },
    { name: 'Sóc Trăng', coordinates: [105.974, 9.6025] },
    { name: 'Sơn La', coordinates: [103.909, 21.327] },
    { name: 'Tây Ninh', coordinates: [106.1314, 11.31] },
    { name: 'Thái Bình', coordinates: [106.34, 20.5381] },
    { name: 'Thái Nguyên', coordinates: [105.8252, 21.5672] },
    { name: 'Thanh Hóa', coordinates: [105.7799, 19.8072] },
    { name: 'Tiền Giang', coordinates: [106.3602, 10.4493] },
    { name: 'Trà Vinh', coordinates: [106.3439, 9.9347] },
    { name: 'Tuyên Quang', coordinates: [105.2613, 21.8194] },
    { name: 'Vĩnh Long', coordinates: [105.972, 10.2537] },
    { name: 'Vĩnh Phúc', coordinates: [105.5987, 21.3089] },
    { name: 'Yên Bái', coordinates: [104.8752, 21.7049] },
  ];
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
  private simplifyPath(
    coordinates: [number, number][],
    tolerance: number = 0.001,
  ): [number, number][] {
    const points = coordinates.map(([lng, lat]) => ({ x: lng, y: lat }));
    const simplified = simplify(points, tolerance, true);
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
        startTime,
        endTime,
        ...rest
      } = createRouteDto;

      const conflictRoute = await this.routeModel.findOne({
        userId,
        status: 'active', // chỉ kiểm tra với tuyến đang hoạt động
        $or: [
          {
            // startTime của tuyến mới nằm trong khoảng thời gian của tuyến cũ
            startTime: { $lte: startTime },
            endTime: { $gte: startTime },
          },
          {
            // endTime của tuyến mới nằm trong khoảng thời gian của tuyến cũ
            startTime: { $lte: endTime },
            endTime: { $gte: endTime },
          },
          {
            // Tuyến mới bao trùm tuyến cũ
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

      // Ánh xạ WaypointDto sang Waypoint
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
          };
        }) || [];

      // Tạo simplifiedPath nếu path tồn tại
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

  private metersToRadians(meters: number): number {
    return meters / this.EARTH_RADIUS_METERS;
  }

  async search(searchRouteDto: SearchRouteDto): Promise<Route[]> {
    const query = this.buildQuery(searchRouteDto);
    const geoConditions = this.buildGeoConditions(searchRouteDto);

    if (geoConditions.length > 0) {
      // Nếu có cả startCoords và endCoords, dùng $and; nếu không, dùng $or
      if (searchRouteDto.startCoords && searchRouteDto.endCoords) {
        query.$and = geoConditions; // Yêu cầu cả hai nhóm điều kiện
      } else {
        query.$or = geoConditions; // Chỉ cần một nhóm điều kiện
      }
    }

    return await this.routeModel.find(query).populate('userId').exec();
  }

  private buildQuery({
    name,
    seatsAvailable,
    priceRange,
    status,
    date,
    maxDistance = 5000,
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
      const start = new Date(date);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      query.$or = [
        { startTime: { $gte: start, $lte: end } },
        { 'waypoints.estimatedArrivalTime': { $gte: start, $lte: end } },
      ];
    }

    // 🔍 Lọc theo khoảng cách tối đa tài xế cho phép
    query.maxPickupDistance = { $gte: maxDistance };

    return query;
  }

  private buildGeoConditions({
    startCoords,
    endCoords,
    maxDistance = 5000,
  }: SearchRouteDto): any[] {
    const geoConditions: any[] = [];

    if (startCoords) {
      const geoWithin = this.createGeoWithinCondition(startCoords, maxDistance);
      const geoIntersects = this.createGeoIntersectsCondition(
        startCoords,
        maxDistance,
      );

      geoConditions.push({
        $or: [
          { startPoint: geoWithin },
          { 'waypoints.coordinates': geoWithin },
          { simplifiedPath: geoIntersects },
        ],
      });
    }

    if (endCoords) {
      const geoWithin = this.createGeoWithinCondition(endCoords, maxDistance);
      const geoIntersects = this.createGeoIntersectsCondition(
        endCoords,
        maxDistance,
      );

      geoConditions.push({
        $or: [
          { endPoint: geoWithin },
          { 'waypoints.coordinates': geoWithin },
          { simplifiedPath: geoIntersects },
        ],
      });
    }

    return geoConditions;
  }

  private createGeoWithinCondition(
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

  private createGeoIntersectsCondition(
    coords: { lng: number; lat: number },
    maxDistance: number,
  ): any {
    const center = [coords.lng, coords.lat];
    const radius = maxDistance / 1000; // Chuyển sang km
    const circle = turf.circle(center, radius, {
      steps: 64,
      units: 'kilometers',
    });
    return {
      $geoIntersects: {
        $geometry: circle.geometry, // GeoJSON Polygon
      },
    };
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

          // ✅ Tạo TripConfirmation
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

  private async getRouteData(
    start: [number, number],
    end: [number, number],
    waypoints: [number, number][] = [],
    retries = 3,
  ): Promise<{ distance: number; duration: number; path: [number, number][] }> {
    if (!this.mapboxAccessToken) {
      throw new Error('Mapbox Access Token is missing');
    }

    const coordinates = [start, ...waypoints, end]
      .map((coord) => `${coord[0]},${coord[1]}`)
      .join(';');
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?geometries=geojson&access_token=${this.mapboxAccessToken}`;

    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios.get(url);
        const route = response.data.routes[0];
        if (!route) {
          throw new Error('No routes found in Mapbox response');
        }
        return {
          distance: route.distance / 1000, // km
          duration: route.duration, // giây
          path: route.geometry.coordinates as [number, number][],
        };
      } catch (error) {
        if (error.response?.status === 401) {
          throw new Error(
            'Mapbox API: Unauthorized - Invalid or missing access token',
          );
        }
        if (error.response?.status === 429 && i < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
        throw new Error(`Mapbox API error: ${error.message}`);
      }
    }
    throw new Error('Mapbox API: Max retries reached');
  }

  // private async generateRoute(index: number): Promise<Route> {
  //   const startLocation = this.getRandomItem(this.locations);
  //   let endLocation = this.getRandomItem(this.locations);
  //   while (endLocation.name === startLocation.name) {
  //     endLocation = this.getRandomItem(this.locations);
  //   }

  //   // Chọn 0-2 waypoints ngẫu nhiên
  //   const waypointCount = faker.number.int({ min: 0, max: 2 });
  //   const waypointLocations: Location[] = [];
  //   for (let i = 0; i < waypointCount; i++) {
  //     let waypoint = this.getRandomItem(this.locations);
  //     while (
  //       waypoint.name === startLocation.name ||
  //       waypoint.name === endLocation.name ||
  //       waypointLocations.some((w) => w.name === waypoint.name)
  //     ) {
  //       waypoint = this.getRandomItem(this.locations);
  //     }
  //     waypointLocations.push(waypoint);
  //   }

  //   // Lấy dữ liệu từ Mapbox
  //   const { distance, duration, path } = await this.getRouteData(
  //     startLocation.coordinates,
  //     endLocation.coordinates,
  //     waypointLocations.map((w) => w.coordinates),
  //   );

  //   // Tạo waypoints cho schema
  //   let totalDistance = 0;
  //   const waypointData = waypointLocations.map((loc, idx) => {
  //     totalDistance +=
  //       idx === 0
  //         ? distance / (waypointCount + 1)
  //         : distance / (waypointCount + 1);
  //     return {
  //       coordinates: loc.coordinates,
  //       distance: totalDistance,
  //       name: loc.name,
  //     };
  //   });

  //   // Sinh các giá trị khác
  //   const price = Math.round(
  //     distance * faker.number.int({ min: 500, max: 1000 }),
  //   ); // 500-1000 VND/km
  //   const seatsAvailable = faker.number.int({ min: 10, max: 50 });
  //   const frequency = faker.helpers.arrayElement([
  //     'daily',
  //     'weekly',
  //     'monthly',
  //   ]);
  //   const startTime = faker.date.soon({ days: 30 });

  //   return {
  //     userId: faker.database.mongodbObjectId(),
  //     name: `${startLocation.name} - ${endLocation.name}`,
  //     startPoint: { type: 'Point', coordinates: startLocation.coordinates },
  //     endPoint: { type: 'Point', coordinates: endLocation.coordinates },
  //     waypoints: waypointData,
  //     path: { type: 'LineString', coordinates: path },
  //     simplifiedPath: {
  //       type: 'LineString',
  //       coordinates: [startLocation.coordinates, endLocation.coordinates],
  //     },
  //     distance,
  //     duration,
  //     frequency,
  //     startTime,
  //     seatsAvailable,
  //     price,
  //     status: 'active',
  //     routeIndex: index,
  //   };
  // }

  // Chọn ngẫu nhiên phần tử từ mảng
  private getRandomItem<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  // Tạo 1000 tuyến đường
  // async generateRoutes(count: number = 1000): Promise<{ message: string }> {
  //   const batchSize = 100;
  //   const routes: Route[] = [];

  //   for (let i = 0; i < count; i++) {
  //     const route = await this.generateRoute(i + 1);
  //     routes.push(route);

  //     // Chèn theo batch
  //     if (routes.length === batchSize || i === count - 1) {
  //       try {
  //         await this.routeModel.insertMany(routes, { ordered: false });
  //         console.log(`Đã chèn ${i + 1} tuyến đường`);
  //       } catch (error) {
  //         console.error(`Lỗi khi chèn batch ${i + 1}:`, error);
  //       }
  //       routes.length = 0; // Xóa batch
  //     }
  //   }

  //   return { message: `Đã tạo ${count} tuyến đường thành công` };
  // }

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

  async getRequestsByDriverId(driverId: string): Promise<Request[]> {
    try {
      // Lấy tất cả route mà tài xế đã tạo
      const routes = await this.routeModel
        .find({ userId: driverId }, { _id: 1 })
        .exec();

      if (!routes || routes.length === 0) {
        throw new NotFoundException(
          `No routes found for driver with ID ${driverId}`,
        );
      }

      const routeIds = routes.map((route) => route._id);

      // Lấy các request có routeId nằm trong các route tài xế đã tạo
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

      return requests;
    } catch (error) {
      // Nếu không phải lỗi do NotFoundException thì ném lỗi server
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
}
