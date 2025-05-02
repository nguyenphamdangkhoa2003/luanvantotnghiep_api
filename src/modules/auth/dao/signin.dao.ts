import { User } from '@/modules/users/schemas/user.schema';

export interface SignInDao {
  access_token: string;
  user: User;
}
