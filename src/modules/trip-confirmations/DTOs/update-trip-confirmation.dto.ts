import { IsOptional, IsBoolean, IsString } from 'class-validator';

export class UpdateTripConfirmationDto {
  @IsOptional()
  @IsBoolean()
  confirmedByDriver?: boolean;

  @IsOptional()
  @IsBoolean()
  confirmedByPassenger?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
