import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class HandleRequestDto {
  @IsString()
  @IsNotEmpty()
  requestId: string;

  @IsString()
  @IsIn(['accept', 'reject'])
  action: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
