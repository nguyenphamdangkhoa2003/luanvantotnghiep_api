import { User } from '@/modules/users/schemas/user.schema';
import { Types } from 'mongoose';

export interface IJwtPayload {
  sub: Types.ObjectId;
  email: string;
}

export interface IUserQuery {
  [key: string]: any;
}


export interface IAuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}
