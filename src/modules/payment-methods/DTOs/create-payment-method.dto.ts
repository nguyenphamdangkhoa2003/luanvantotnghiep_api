import { PaymentMethodType } from '@/common/enums/paymen-method.enum';
import { PaymentProvider } from '@/common/enums/payment-provider.enum';
import { IsString, IsIn, IsOptional } from 'class-validator';

export class CreatePaymentMethodDto {
  @IsString()
  @IsIn(Object.values(PaymentMethodType), {
    message: `Type must be one of: ${Object.values(PaymentMethodType).join(', ')}`,
  })
  type: PaymentMethodType;

  @IsString()
  @IsIn(Object.values(PaymentProvider), {
    message: `Provider must be one of: ${Object.values(PaymentProvider).join(', ')}`,
  })
  provider: PaymentProvider;

  @IsString()
  token: string;

  @IsOptional()
  @IsString()
  last4?: string;
}
