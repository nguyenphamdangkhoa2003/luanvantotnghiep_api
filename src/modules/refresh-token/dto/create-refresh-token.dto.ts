import { IsString } from 'class-validator';
import { Types } from 'mongoose';

export class CreateRefreshTokenDto {
  @IsString()
  token: string;

  @IsString()
  userId: Types.ObjectId;
}
