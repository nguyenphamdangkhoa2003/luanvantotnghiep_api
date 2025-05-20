import { UserDocument } from '@/modules/users/schemas/user.schema';
import { Request } from 'express';

export interface ApiResponse<T = unknown> {
  message: string;
  code: number;
  data?: T;
}
export interface AuthRequest extends Request {
  user: UserDocument;
}

export interface IMessage {
  id: string;
  message: string;
}

export interface IPoint {
  lng: number;
  lat: number;
}
