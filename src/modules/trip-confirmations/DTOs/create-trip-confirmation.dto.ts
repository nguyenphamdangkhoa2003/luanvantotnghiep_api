import { IsMongoId, IsOptional, IsBoolean, IsString } from 'class-validator';

export class CreateTripConfirmationDto {
  @IsMongoId()
  tripRequestId: string;

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
