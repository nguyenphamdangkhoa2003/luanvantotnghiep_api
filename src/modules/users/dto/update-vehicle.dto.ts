import { IsNumber, IsOptional, IsString, IsUrl } from "class-validator";

export class UpdateVehicleDto {
  @IsString()
  @IsOptional()
  licensePlate?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsOptional()
  seats?: number;
}
