import { Point } from '@/modules/routes/DTOs/create-route.dto';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
  IsNotEmpty,
  Max,
} from 'class-validator';

export class SearchRouteDto {
  @IsOptional()
  @IsNumber()
  startCoords?: { lng: number; lat: number };

  @IsOptional()
  @IsNumber()
  endCoords?: { lng: number; lat: number };

  @IsOptional()
  @IsNumber()
  @Max(10000) // Giới hạn khoảng cách tối đa hợp lý
  maxDistance?: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  frequency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  seatsAvailable?: number;

  @IsOptional()
  priceRange?: { min?: number; max?: number };

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  page?: number = 0;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
