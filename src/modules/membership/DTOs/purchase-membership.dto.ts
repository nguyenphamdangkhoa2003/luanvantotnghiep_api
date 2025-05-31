import { IsNotEmpty } from 'class-validator';

export class PurchaseMembershipDto {
  @IsNotEmpty()
  packageType: string;
}
