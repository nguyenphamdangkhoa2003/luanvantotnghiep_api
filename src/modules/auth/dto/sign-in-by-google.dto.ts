import { NAME_REGEX } from '@/common/constants/regex.constant';
import { SignUpDto } from '@/modules/auth/dto/sign-up.dto';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
} from 'class-validator';

export class SignInByGoogleDto {
  @IsString()
  @Length(3, 100, {
    message: 'Tên phải có độ dài từ 3 đến 50 ký tự.',
  })
  @Matches(NAME_REGEX, {
    message: 'Tên chỉ có thể chứa chữ cái, dtos, số và khoảng trắng',
  })
  public name!: string;

  @IsString()
  @IsEmail()
  @Length(5, 255)
  public email!: string;
  
  @IsUrl()
  @IsOptional()
  avatar: string;
}
