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
  IsUrl,
  Length,
  Matches,
} from 'class-validator';
import {
  BCRYPT_HASH_OR_UNSET,
  NAME_REGEX,
  SLUG_REGEX,
} from '@/common/constants/regex.constant';
import {
  Credentials,
  CredentialsSchema,
} from '@/modules/users/schemas/credentials.schema';
import { OAuthProvider } from '@/modules/auth/schemas/oauth-provider.schema';

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
  @Matches(BCRYPT_HASH_OR_UNSET)
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
  public isEmailVerified: boolean;

  @Prop({ type: Date, default: Date.now })
  @IsDate()
  public createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  @IsDate()
  public updatedAt: Date;

  @Prop([{ type: Types.ObjectId, ref: 'OAuthProvider' }])
  oauthProviders: OAuthProvider[];

  @Prop({ type: CredentialsSchema, default: () => ({}) })
  public credentials: Credentials;

  @Prop({ required: false })
  @IsUrl()
  @IsOptional()
  avatar: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
