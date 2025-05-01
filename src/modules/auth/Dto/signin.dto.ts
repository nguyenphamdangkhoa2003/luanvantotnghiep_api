import { IsNotEmpty } from 'class-validator';
import { User } from 'src/modules/users/schemas/user.schema';

export class SignInDto {
  @IsNotEmpty({ message: 'Username là trường bắt buộc' })
  username: string;
  @IsNotEmpty({ message: 'Mật khẩu là trường bắt buộc' })
  password: string;
}
