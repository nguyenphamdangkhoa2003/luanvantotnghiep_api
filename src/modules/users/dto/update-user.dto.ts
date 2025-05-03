import { NAME_REGEX, SLUG_REGEX } from '@/common/constants/regex.constant';
import { isNull, isUndefined } from '@/common/utils/validation.util';
import { IsString, Length, Matches, ValidateIf } from 'class-validator';

export abstract class UpdateUserDto {
  @IsString()
  @Length(3, 106)
  @Matches(SLUG_REGEX, {
    message: 'Username must be a valid slugs',
  })
  @ValidateIf(
    (o: UpdateUserDto) =>
      !isUndefined(o.username) || isUndefined(o.name) || isNull(o.name),
  )
  public username?: string;

  @IsString()
  @Length(3, 100)
  @Matches(NAME_REGEX, {
    message: 'Name must not have special characters',
  })
  @ValidateIf(
    (o: UpdateUserDto) =>
      !isUndefined(o.name) || isUndefined(o.username) || isNull(o.username),
  )
  public name?: string;
}
