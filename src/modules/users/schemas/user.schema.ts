import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
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
import { DriverLicense } from '@/modules/users/schemas/driver-license.schema';
import { Vehicle } from '@/modules/users/schemas/vehicle.schema';
import { IdentityDocument } from '@/modules/users/schemas/identity-document.schema';
import { MembershipPackageType } from '@/common/enums/membership-package-type.enum';

export enum UserRole {
  ADMIN = 'admin',
  CUSTOMER = 'customer',
  DRIVER = 'driver',
}

export type UserDocument = HydratedDocument<User>;

@Schema()
export class User {
  declare _id: string;

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

  // ============================= MODULE PROFILE =============================

  @Prop({ type: String, required: false })
  @IsOptional()
  @IsPhoneNumber()
  phoneNumber?: string;

  @Prop({ type: String, required: false })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @Prop({ type: IdentityDocument, required: false })
  @IsOptional()
  identityDocument?: IdentityDocument;

  @Prop({ type: DriverLicense, required: false })
  @IsOptional()
  driverLicense?: DriverLicense;

  @Prop({ type: [Vehicle], required: false })
  @IsOptional()
  @IsArray()
  vehicles?: Vehicle[];

  // NEW: Mô tả hồ sơ công khai (tùy chọn)
  @Prop({ type: String, required: false })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  bio?: string;

  @Prop({ default: false })
  isOnline: boolean;

  @Prop()
  lastSeen: Date;

  @Prop({
    type: {
      packageType: {
        type: String,
        enum: Object.values(MembershipPackageType),
        default: null,
        required: false,
      },
      remainingRequests: {
        type: Number,
        default: 0,
      },
      endDate: {
        type: Date,
        default: null,
        required: false,
      },
    },
    default: () => ({
      packageType: null,
      remainingRequests: 0,
      endDate: null,
    }),
  })
  currentMembership: {
    packageType?: MembershipPackageType;
    remainingRequests: number;
    endDate?: Date;
  };

  @Prop({ default: 0 })
  averageRating: number; // Điểm đánh giá trung bình

  @Prop({ default: 0 })
  ratingCount: number; // Số lượng đánh giá
}
export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ 'vehicles._id': 1 });
