import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RequestRouteDto {
  @IsString()
  @IsNotEmpty()
  routeId: string; // ID của tuyến đường

  @IsOptional()
  message?: string; // Tin nhắn kèm theo (tùy chọn)
}
