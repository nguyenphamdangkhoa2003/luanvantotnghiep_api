import { IsEmail, IsString, Length } from 'class-validator';

export abstract class EmailDto {
  @IsString({ message: 'email phải là một chuỗi' })
  @IsEmail({}, { message: 'email phải đúng định dạng' })
  public email: string;
}
