import { User } from '@/modules/users/schemas/user.schema';
import { Types } from 'mongoose';

export interface IUserQuery {
  [key: string]: any;
}


export interface IAuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}
