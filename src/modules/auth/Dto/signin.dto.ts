import { IsNotEmpty } from 'class-validator';

export class SignInDto {
  @IsNotEmpty({ message: 'Username là trường bắt buộc' })
  username: string;
  @IsNotEmpty({ message: 'Mật khẩu là trường bắt buộc' })
  password: string;
}
