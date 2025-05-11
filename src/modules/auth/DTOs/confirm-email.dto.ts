import { IsJWT, IsNotEmpty, IsString } from 'class-validator';

export class ConfirmEmailDto {
  @IsJWT({ message: 'Token không hợp lệ' })
  @IsString()
  @IsNotEmpty({ message: 'Token xác nhận không được để trống' })
  token: string;
}
