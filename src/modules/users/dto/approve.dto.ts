import { VerificationStatus } from '@/common/enums/verification-status.enum';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ApproveDto {
  @IsEnum(VerificationStatus)
  verificationStatus: VerificationStatus;

  @IsString()
  @IsOptional()
  rejectionReason?: string; // Lý do từ chối (nếu có)
}
