import { PaymentMethodType } from '@/common/enums/paymen-method.enum';
import { PaymentProvider } from '@/common/enums/payment-provider.enum';
import { Prop, Schema } from '@nestjs/mongoose';
import { IsString, IsObject, IsBoolean } from 'class-validator';
import { Types } from 'mongoose';

// Sub-schema cho phương thức thanh toán
@Schema()
export class PaymentMethod {
  @Prop({ type: Types.ObjectId, auto: true }) // Thêm _id
  _id: Types.ObjectId;

  @Prop({ type: String, required: true, enum: PaymentMethodType })
  @IsString()
  type: PaymentMethodType;

  @Prop({ type: Object, required: true })
  @IsObject()
  details: {
    provider: PaymentProvider;
    token: string;
    last4?: string;
    [key: string]: any; // Cho phép thêm các trường khác từ cổng thanh toán
  };

  @Prop({ type: Boolean, default: false })
  @IsBoolean()
  isVerified: boolean;
}
