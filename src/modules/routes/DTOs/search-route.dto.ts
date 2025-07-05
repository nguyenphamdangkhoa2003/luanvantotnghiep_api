import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class PointDto {
  @IsNumber()
  @Type(() => Number)
  lng: number;

  @IsNumber()
  @Type(() => Number)
  lat: number;
}

class PriceRangeDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  min?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  max?: number;
}

export class SearchRouteDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => PointDto)
  startCoords?: PointDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PointDto)
  endCoords?: PointDto;

  @IsNumber()
  @Max(10000)
  @Type(() => Number)
  maxDistance: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  name?: string;


  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  seatsAvailable?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => PriceRangeDto)
  priceRange?: PriceRangeDto;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  page?: number = 0;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;
}
