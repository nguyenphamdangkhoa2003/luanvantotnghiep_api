import { IsString } from 'class-validator';

export class GetPassengersDto {
  @IsString()
  routeId: string; // ID của tuyến đường
}
