import {
  IsOptional,
  IsString,
  IsNumber,
  IsDateString,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WaypointDto } from '@/modules/routes/DTOs/create-route.dto';

export class UpdateRouteDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsNumber()
  seatsAvailable?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WaypointDto)
  @IsOptional()
  waypoints?: WaypointDto[];
}
