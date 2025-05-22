import { MembershipPackageType } from '@/common/enums/membership-package-type.enum';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class PurchaseMembershipDto {
  @IsEnum(MembershipPackageType)
  @IsNotEmpty()
  packageType: string;
}
