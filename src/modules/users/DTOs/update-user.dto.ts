import {
  IsOptional,
  IsString,
  Length,
  Matches,
  IsPhoneNumber,
  IsDateString,
  IsUrl,
} from 'class-validator';
import { NAME_REGEX } from '@/common/constants/regex.constant';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @Length(3, 100)
  @Matches(NAME_REGEX, { message: 'Name must not have special characters' })
  name?: string;

  @IsOptional()
  @IsPhoneNumber(undefined, { message: 'Invalid phone number' })
  phoneNumber?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Invalid date of birth' })
  dateOfBirth?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Invalid avatar URL' })
  avatar?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500, { message: 'Bio must be less than 500 characters' })
  bio?: string;
}
