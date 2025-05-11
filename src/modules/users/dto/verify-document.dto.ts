import { IsString, IsIn, IsOptional } from 'class-validator';

export class VerifyDocumentDto {
  @IsString()
  @IsIn(['approve', 'reject'])
  action: 'approve' | 'reject';

  @IsString()
  @IsOptional()
  reason?: string;
}
