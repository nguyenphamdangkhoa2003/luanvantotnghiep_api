import { IsJWT, IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsString({ message: 'refreshToken bắt buộc là một chuỗi ' })
  @IsJWT({ message: 'refreshToken không hợp lệ' })
  refreshToken: string;

  domain?: string;
}
