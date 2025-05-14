import { VerificationStatus } from '@/common/enums/verification-status.enum';
import { Prop, Schema } from '@nestjs/mongoose';
import { IsDate, IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';

@Schema()
export class IdentityDocument {
  @Prop({ type: String, required: true })
  @IsString()
  documentNumber: string;

  @Prop({ type: String, required: true })
  @IsUrl()
  frontImage: string;

  @Prop({ type: String, required: true })
  @IsUrl()
  backImage: string;

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
