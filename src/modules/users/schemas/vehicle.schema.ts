import { VerificationStatus } from "@/common/enums/verification-status.enum";
import { Prop, Schema } from "@nestjs/mongoose";
import { IsDate, IsEnum, IsOptional, IsString, IsUrl } from "class-validator";

@Schema()
export class Vehicle {
  @Prop({ type: String, required: true })
  @IsString()
  licensePlate: string; // Biển số xe

  @Prop({ type: String, required: true })
  @IsString()
  model: string; // Mẫu xe (ví dụ: Toyota Camry)

  @Prop({ type: Number, required: true })
  seats: number; // Số chỗ ngồi

  @Prop({ type: String, required: true })
  @IsUrl()
  registrationDocument: string; // URL tới giấy đăng ký xe

  @Prop({ type: String })
  @IsOptional()
  @IsUrl()
  insuranceDocument?: string; // URL tới giấy bảo hiểm (tùy chọn)

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
