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
import { VerificationStatus } from '@/common/enums/verification-status.enum';
import { RequestStatus } from '@/common/enums/request-status.enum';
import {
  Passenger,
  PassengerDocument,
} from '@/modules/routes/schemas/Passenger.schema';
import { GetPassengersDto } from '@/modules/routes/DTOs/get-passengers.dto';

@Injectable()
export class RoutesService {
  private readonly goongApiKey: string;
  constructor(
    @InjectModel(Route.name) private routeModel: Model<RouteDocument>,
    @InjectModel(Request.name) private requestModel: Model<RequestDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Passenger.name)
    private passengerModel: Model<PassengerDocument>,
    private readonly configService: ConfigService,
    private notificationService: NotificationService,
    private mailService: MailService,
  ) {
    this.goongApiKey = configService.getOrThrow<string>('goong_api_key');
  }

  // Lấy tọa độ từ địa chỉ sử dụng Goong Geocoding API
  async getCoordinates(address: string): Promise<{ lat: number; lng: number }> {
    const url = `https://rsapi.goong.io/geocode?address=${encodeURIComponent(address)}&api_key=${this.goongApiKey}`;
    const response = await axios.get(url);
    const result = response.data.results[0];
    return {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
    };
  }

  async getRoutePath(
    start: [number, number],
    end: [number, number],
    waypoints?: [number, number][],
  ): Promise<{
    path: [number, number][];
    distance: number;
    duration: number;
  }> {
    const origin = `${start[1]},${start[0]}`;
    const destination = `${end[1]},${end[0]}`;
    let url = `https://rsapi.goong.io/Direction?origin=${origin}&destination=${destination}&vehicle=car&api_key=${this.goongApiKey}`;

    if (waypoints && waypoints.length > 0) {
      const waypointsStr = waypoints.map((wp) => `${wp[1]},${wp[0]}`).join(';');
      url += `&waypoints=${waypointsStr}`;
    }

    const response = await axios.get(url);
    const route = response.data.routes[0];
    const path = route.overview_polyline.points;
    const distance =
      route.legs.reduce((sum, leg) => sum + leg.distance.value, 0) / 1000;
    const duration =
      route.legs.reduce((sum, leg) => sum + leg.duration.value, 0) / 60;

    // Giải mã polyline thành mảng tọa độ [lng, lat]
    const decodedPath = require('@mapbox/polyline')
      .decode(path)
      .map(([lat, lng]) => [lng, lat]);

    return { path: decodedPath, distance, duration };
  }

  async create(userId: string, createRouteDto: CreateRouteDto): Promise<Route> {
    const { startAddress, endAddress, waypointAddresses, ...rest } =
      createRouteDto;

    const startCoords = await this.getCoordinates(startAddress);
    const endCoords = await this.getCoordinates(endAddress);
    const waypointCoords = waypointAddresses
      ? await Promise.all(
          waypointAddresses.map((addr) => this.getCoordinates(addr)),
        )
      : [];

    const { path, distance, duration } = await this.getRoutePath(
      [startCoords.lng, startCoords.lat],
      [endCoords.lng, endCoords.lat],
      waypointCoords.map((wp) => [wp.lng, wp.lat]),
    );

    const route = new this.routeModel({
      userId,
      ...rest,
      startPoint: {
        type: 'Point',
        coordinates: [startCoords.lng, startCoords.lat],
      },
      endPoint: { type: 'Point', coordinates: [endCoords.lng, endCoords.lat] },
      waypoints: waypointCoords.map((wp) => ({
        type: 'Point',
        coordinates: [wp.lng, wp.lat],
      })),
      path: { type: 'LineString', coordinates: path },
      distance,
      duration,
      status: 'active',
    });

    return route.save();
  }

  async search(searchRouteDto: SearchRouteDto): Promise<Route[]> {
    const {
      startAddress,
      endAddress,
      maxDistance = 5000,
      date,
    } = searchRouteDto;
    const query: any = {};

    if (date) {
      query.startTime = {
        $gte: new Date(date),
        $lte: new Date(new Date(date).setHours(23, 59, 59)),
      };
    }

    if (startAddress) {
      const startCoords = await this.getCoordinates(startAddress);
      query.startPoint = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [startCoords.lng, startCoords.lat],
          },
          $maxDistance: maxDistance,
        },
      };
    }

    if (endAddress) {
      const endCoords = await this.getCoordinates(endAddress);
      query.endPoint = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [endCoords.lng, endCoords.lat],
          },
          $maxDistance: maxDistance,
        },
      };
    }

    return this.routeModel.find(query).exec();
  }

  async advancedSearch(
    advancedSearchRouteDto: AdvancedSearchRouteDto,
  ): Promise<Route[]> {
    const {
      pointAddress,
      maxDistance = 5000,
      priceRange,
      seatsAvailable,
      frequency,
      date,
    } = advancedSearchRouteDto;
    const query: any = {};

    if (pointAddress) {
      const pointCoords = await this.getCoordinates(pointAddress);
      query.path = {
        $geoWithin: {
          $centerSphere: [
            [pointCoords.lng, pointCoords.lat],
            maxDistance / 6378137, // Chuyển đổi mét thành radian (bán kính Trái Đất ~6378.137 km)
          ],
        },
      };
    }

    if (priceRange) {
      query.price = { $gte: priceRange.min, $lte: priceRange.max };
    }

    if (seatsAvailable) {
      query.seatsAvailable = { $gte: seatsAvailable };
    }

    if (frequency) {
      query.frequency = frequency;
    }

    if (date) {
      query.startTime = {
        $gte: new Date(date),
        $lte: new Date(new Date(date).setHours(23, 59, 59)),
      };
    }

    return this.routeModel.find(query).limit(10).skip(0).exec();
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
}
