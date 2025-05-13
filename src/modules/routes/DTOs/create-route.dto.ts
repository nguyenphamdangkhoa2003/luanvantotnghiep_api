import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsNumber,
  IsPositive,
  IsInt,
} from 'class-validator';

export class CreateRouteDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  startAddress: string;

  @IsString()
  @IsNotEmpty()
  endAddress: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  waypointAddresses?: string[];

  @IsString()
  @IsNotEmpty()
  frequency: string;

  @IsString()
  @IsNotEmpty()
  startTime: string;

  @IsInt()
  @IsPositive()
  seatsAvailable: number;

  @IsNumber()
  @IsPositive()
  price: number;
}
