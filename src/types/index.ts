import { User } from '@/modules/users/schemas/user.schema';
import { Request } from 'express';

export interface ApiResponse<T = unknown> {
  message: string;
  code: number;
  data?: T;
}
export interface AuthRequest extends Request {
  user: User;
}

export interface IMessage {
  id: string;
  message: string;
}
