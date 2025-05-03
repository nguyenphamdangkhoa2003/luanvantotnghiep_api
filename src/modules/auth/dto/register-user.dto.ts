import { NAME_REGEX } from "@/common/constants/regex.constant";
import { IsEmail, IsString, Length, Matches } from "class-validator";

export class RegisterUserDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  public email: string;

  @IsString()
  @Length(8, 100, { message: 'Mật khẩu phải từ 8 đến 100 ký tự' })
  public password: string;

  @IsString()
  @Length(3, 100)
  @Matches(NAME_REGEX, {
    message: 'Tên không được có ký tự đặc biệt',
  })
  public name: string;
}
