import { Types } from 'mongoose';

export interface JwtPayload {
  sub: Types.ObjectId;
  email: string;
}

export interface UserQuery {
  [key: string]: any;
}

export interface UserToken {
  access_token: string;
  refresh_token: string;
}
