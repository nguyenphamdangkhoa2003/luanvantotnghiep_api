import {
  IsArray,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePackageDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  acceptRequests?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  price?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  durationDays?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  description?: string[];
}
