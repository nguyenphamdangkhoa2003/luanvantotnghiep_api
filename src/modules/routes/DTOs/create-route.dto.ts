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
}

export class CreateRouteDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  startAddress: string;

  @IsNotEmpty()
  startCoords: Point;

  @IsString()
  @IsNotEmpty()
  endAddress: string;

  @IsNotEmpty()
  endCoords: Point;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WaypointDto)
  @IsOptional()
  waypoints?: WaypointDto[];

  @IsString()
  @IsNotEmpty()
  frequency: string;

  @IsDate()
  @Type(() => Date)
  startTime: Date;

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
}
