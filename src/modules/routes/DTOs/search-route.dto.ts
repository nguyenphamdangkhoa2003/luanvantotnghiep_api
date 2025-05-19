import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
} from 'class-validator';

export class SearchRouteDto {
  @IsString()
  @IsOptional()
  startAddress?: string; // Địa chỉ điểm xuất phát

  @IsString()
  @IsOptional()
  endAddress?: string; // Địa chỉ điểm đến

  @IsNumber()
  @IsOptional()
  @Min(0)
  maxDistance?: number; // Khoảng cách tối đa (mét)

  @IsDateString()
  @IsOptional()
  date?: string; // Ngày khởi hành

  @IsString()
  @IsOptional()
  name?: string; // Tên tuyến đường (tìm kiếm gần đúng)

  @IsString()
  @IsOptional()
  frequency?: string; // Tần suất (daily, weekly)

  @IsNumber()
  @IsOptional()
  @Min(0)
  seatsAvailable?: number; // Số ghế trống tối thiểu

  @IsOptional()
  priceRange?: {
    min?: number; // Giá tối thiểu
    max?: number; // Giá tối đa
  };

  @IsString()
  @IsOptional()
  status?: string; // Trạng thái (active, inactive)
}
