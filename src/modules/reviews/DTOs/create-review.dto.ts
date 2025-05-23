import {
  IsString,
  IsNumber,
  IsIn,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReviewDto {
  @IsString()
  @IsNotEmpty()
  revieweeId: string;

  @IsString()
  @IsNotEmpty()
  tripRequestId: string;

  @IsNumber()
  @Type(() => Number)
  rating: number;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsString()
  @IsIn(['driver', 'customer']) 
  reviewType: 'driver' | 'customer';
}
