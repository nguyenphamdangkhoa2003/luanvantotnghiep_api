import { User } from 'src/modules/users/schemas/user.schema';

export interface SignInDao {
  access_token: string;
  user: User;
}
