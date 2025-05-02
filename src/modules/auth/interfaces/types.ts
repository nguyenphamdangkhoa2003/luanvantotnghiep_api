import { Types } from 'mongoose';

export interface IJwtPayload {
  sub: Types.ObjectId;
  email: string;
}

export interface IUserQuery {
  [key: string]: any;
}

export interface IUserToken {
  access_token: string;
  refresh_token: string;
}
