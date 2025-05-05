import { IsNotEmpty, IsString } from 'class-validator';

export class LogoutDto {
  @IsString({message: "refresh token phải là một chuỗi"})
  @IsNotEmpty({ message: 'refresh token nên được cung cấp' })
  refreshToken: string;
}
