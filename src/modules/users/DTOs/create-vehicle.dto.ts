import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  licensePlate: string;

  @IsString()
  model: string;

  @IsNotEmpty()
  seats: number;
}
