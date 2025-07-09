import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsNumber,
  IsPositive,
  IsInt,
  Min,
  ValidateNested,
  IsDate,
} from 'class-validator';

export class Point {
  @IsNumber()
  lng: number;

  @IsNumber()
  lat: number;
}

class RoutePath {
  @IsArray()
  coordinates: number[][];

  @IsString()
  @IsNotEmpty()
  type: string;
}

export class WaypointDto {
  @IsNumber()
  distance: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @ValidateNested()
  @Type(() => Point)
  location: Point;

  // (Tùy chọn) thời điểm đến waypoint nếu cần lịch trình cụ thể
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  estimatedArrivalTime?: Date;
}

export class CreateRouteDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  startAddress: string;

  @ValidateNested()
  @Type(() => Point)
  startCoords: Point;

  @IsString()
  @IsNotEmpty()
  endAddress: string;

  @ValidateNested()
  @Type(() => Point)
  endCoords: Point;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WaypointDto)
  @IsOptional()
  waypoints?: WaypointDto[];

  @IsDate()
  @Type(() => Date)
  startTime: Date;

  @IsDate()
  @Type(() => Date)
  endTime: Date;

  @IsInt()
  @IsPositive()
  seatsAvailable: number;

  @IsNumber()
  @IsPositive()
  price: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  routeIndex?: number;

  @ValidateNested()
  @Type(() => RoutePath)
  @IsOptional()
  path: RoutePath;

  @IsNumber()
  @IsPositive()
  distance: number;

  @IsNumber()
  @IsPositive()
  duration: number;

  // 🚗 Khoảng cách tối đa tài xế sẵn sàng rước hành khách ngoài tuyến (km)
  @IsNumber()
  @IsOptional()
  @Min(0)
  maxPickupDistance?: number;

  @IsOptional()
  @Type(() => Boolean)
  isNegotiable?: boolean;
}
