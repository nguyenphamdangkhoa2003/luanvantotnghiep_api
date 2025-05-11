import { IsString, IsIn } from 'class-validator';

export class UploadDocumentDto {
  @IsString()
  @IsIn(['driverLicense', 'identityDocument'])
  type: 'driverLicense' | 'identityDocument';

  @IsString()
  documentNumber: string;
}
