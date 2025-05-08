import { VerificationStatus } from '@/common/enums/verification-status.enum';
import { Prop, Schema } from '@nestjs/mongoose';
import { IsDate, IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';

@Schema()
export class DriverLicense {
  @Prop({ type: String, required: true })
  @IsString()
  licenseNumber: string;

  @Prop({ type: String, required: true })
  @IsUrl()
  licenseImage: string; // URL tới ảnh giấy phép (lưu trên S3 hoặc tương tự)

  @Prop({
    type: String,
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  @IsEnum(VerificationStatus)
  verificationStatus: VerificationStatus;

  @Prop({ type: Date })
  @IsOptional()
  @IsDate()
  verifiedAt?: Date;
}
