import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import { Route, RouteDocument } from '@/modules/routes/schemas/routes.schema';
import { CreateRouteDto } from '@/modules/routes/DTOs/create-route.dto';
import { SearchRouteDto } from '@/modules/routes/DTOs/search-route.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RoutesService {
  private readonly goongApiKey: string;
  constructor(
    @InjectModel(Route.name) private routeModel: Model<RouteDocument>,
    private readonly configService: ConfigService,
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
    const origin = `${start[1]},${start[0]}`; // lat,lng
    const destination = `${end[1]},${end[0]}`;
    let url = `https://rsapi.goong.io/Direction?origin=${origin}&destination=${destination}&vehicle=car&api_key=${this.goongApiKey}`;

    if (waypoints && waypoints.length > 0) {
      const waypointsStr = waypoints.map((wp) => `${wp[1]},${wp[0]}`).join(';');
      url += `&waypoints=${waypointsStr}`;
    }

    const response = await axios.get(url);
    const route = response.data.routes[0];
    const path = route.overview_polyline.points; // Cần giải mã polyline (dùng thư viện như @mapbox/polyline)
    const distance =
      route.legs.reduce((sum, leg) => sum + leg.distance.value, 0) / 1000; // km
    const duration =
      route.legs.reduce((sum, leg) => sum + leg.duration.value, 0) / 60; // phút

    // Giải mã polyline thành mảng tọa độ [lng, lat]
    const decodedPath = require('@mapbox/polyline')
      .decode(path)
      .map(([lat, lng]) => [lng, lat]);

    return { path: decodedPath, distance, duration };
  }

  // Tạo tuyến đường
  async create(userId: string, createRouteDto: CreateRouteDto): Promise<Route> {
    const { startAddress, endAddress, waypointAddresses, ...rest } =
      createRouteDto;

    // Lấy tọa độ
    const startCoords = await this.getCoordinates(startAddress);
    const endCoords = await this.getCoordinates(endAddress);
    const waypointCoords = waypointAddresses
      ? await Promise.all(
          waypointAddresses.map((addr) => this.getCoordinates(addr)),
        )
      : [];

    // Lấy lộ trình từ Goong API
    const { path, distance, duration } = await this.getRoutePath(
      [startCoords.lng, startCoords.lat],
      [endCoords.lng, endCoords.lat],
      waypointCoords.map((wp) => [wp.lng, wp.lat]),
    );

    // Tạo document
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

  // Tìm kiếm tuyến đường
  async search(searchRouteDto: SearchRouteDto): Promise<Route[]> {
    const {
      startAddress,
      endAddress,
      maxDistance = 5000,
      date,
    } = searchRouteDto;
    const query: any = {};

    // Tìm kiếm theo thời gian nếu có
    if (date) {
      query.startTime = {
        $gte: new Date(date),
        $lte: new Date(new Date(date).setHours(23, 59, 59)),
      };
    }

    // Tìm kiếm theo vị trí
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
}
