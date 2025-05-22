import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class RequestRouteDto {
  @IsString()
  @IsNotEmpty()
  routeId: string; // ID của tuyến đường

  @IsOptional()
  message?: string; // Tin nhắn kèm theo (tùy chọn)

  @IsNumber()
  @Min(1)
  @Transform(({ value }) => Number(value))
  seats: number;
}
