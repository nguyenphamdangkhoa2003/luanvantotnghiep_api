import { NAME_REGEX, SLUG_REGEX } from '@/common/constants/regex.constant';
import { OAuthProvidersEnum } from '@/common/enums/oauth-providers.enum';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @IsString({ message: 'Tên phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên không được để trống' })
  name: string;

  @IsString({ message: 'Mật khẩu phải là chuỗi' })
  password?: string;

  @IsEnum(OAuthProvidersEnum, {
    message: 'Không timf thấy provider được cung cấp',
  })
  provider: OAuthProvidersEnum;

  @IsBoolean()
  @IsOptional()
  public isEmailVerified? = false;

  @IsUrl()
  @IsOptional()
  avatar?: string;
}
