import { Prop, Schema } from "@nestjs/mongoose";
import { IsBoolean, IsObject, IsString } from "class-validator";

@Schema()
export class PaymentMethod {
  @Prop({ type: String, required: true })
  @IsString()
  type: string; // Loại: "credit_card", "bank_account", "mobile_payment"

  @Prop({ type: Object, required: true })
  @IsObject()
  details: Record<string, any>; // Chi tiết (ví dụ: { cardNumber: "****1234", bankName: "Vietcombank" })

  @Prop({ type: Boolean, default: false })
  @IsBoolean()
  isVerified: boolean;
}
