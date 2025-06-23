import { IsArray, IsNumber, IsPositive, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePackageDto {
  @IsString()
  name: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  acceptRequests: number;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  price: number;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  durationDays: number;

  @IsArray()
  @IsString({ each: true })
  description: string[];
}
