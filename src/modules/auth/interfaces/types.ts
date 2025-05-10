import { User } from '@/modules/users/schemas/user.schema';

export interface IUserQuery {
  [key: string]: any;
}

export interface IAuthResult {
  user: User;
}
