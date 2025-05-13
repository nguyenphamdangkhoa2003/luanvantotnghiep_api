import {
  IsString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsInt,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

class PriceRange {
  min: number;
  max: number;
}

export class AdvancedSearchRouteDto {
  @IsString()
  @IsOptional()
  pointAddress?: string; // Địa chỉ điểm bất kỳ trên lộ trình hoặc khu vực

  @IsOptional()
  maxDistance?: number; // Khoảng cách tối đa (mét, mặc định 5000)

  @ValidateNested()
  @Type(() => PriceRange)
  @IsOptional()
  priceRange?: PriceRange; // Khoảng giá

  @IsOptional()
  seatsAvailable?: number; // Số ghế trống tối thiểu

  @IsString()
  @IsIn(['daily', 'weekly', 'monthly'])
  @IsOptional()
  frequency?: string; // Tần suất (daily, weekly, ...)

  @IsString()
  @IsOptional()
  date?: string; // Ngày cụ thể (ISO Date string)
}
