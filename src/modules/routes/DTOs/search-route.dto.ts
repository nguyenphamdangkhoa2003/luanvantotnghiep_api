import { IsString, IsOptional, IsNumber, IsPositive } from 'class-validator';

export class SearchRouteDto {
  @IsString()
  @IsOptional()
  startAddress?: string;

  @IsString()
  @IsOptional()
  endAddress?: string;

  @IsOptional()
  maxDistance?: number;

  @IsString()
  @IsOptional()
  date?: string;
}
