import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { OAuthProvidersEnum } from '@/common/enums/oauth-providers.enum';
import {
  IsBoolean,
  IsDate,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { NAME_REGEX, SLUG_REGEX } from '@/common/constants/regex.constant';

export enum UserRole {
  ADMIN = 'admin',
  CUSTOMER = 'customer',
  DRIVER = 'driver',
}

export type UserDocument = HydratedDocument<User>;

@Schema()
export class User {
  @Prop({ type: Types.ObjectId, auto: true })
  declare public _id: Types.ObjectId;

  @Prop({ required: true, type: String })
  @IsString()
  @Length(3, 106)
  @Matches(SLUG_REGEX, {
    message: 'Username must be a valid slugs',
  })
  public username: string;

  @Prop({ required: true, unique: true, type: String })
  @IsEmail({}, { message: 'Invalid email' })
  public email: string;

  @Prop({ required: true, type: String })
  @IsString()
  @Length(3, 100)
  @Matches(NAME_REGEX, {
    message: 'Name must not have special characters',
  })
  public name: string;

  @Prop({ required: true, type: String })
  @IsString()
  @Length(8, 100, { message: 'Password must be between 8 and 100 characters' })
  public password: string;

  @Prop({ type: String })
  @IsOptional()
  @IsString()
  public googleId: string;

  @Prop({ enum: UserRole, default: UserRole.CUSTOMER, type: String })
  @IsEnum(UserRole, { message: 'Invalid role' })
  public role: UserRole;

  @Prop({ default: false, type: Boolean })
  @IsBoolean()
  public isVerified: boolean;

  @Prop({ type: String })
  @IsOptional()
  @IsString()
  public resetPasswordToken: string;

  @Prop({ type: Date })
  @IsOptional()
  @IsDate()
  public resetPasswordExpires: Date;

  @Prop({ type: Date, default: Date.now })
  @IsDate()
  public createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  @IsDate()
  public updatedAt: Date;

  @Prop({
    enum: OAuthProvidersEnum,
    default: OAuthProvidersEnum.LOCAL,
    type: String,
  })
  @IsEnum(OAuthProvidersEnum, { message: 'Invalid OAuth provider' })
  public provider: OAuthProvidersEnum;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Middleware để mã hóa mật khẩu trước khi lưu
UserSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});
