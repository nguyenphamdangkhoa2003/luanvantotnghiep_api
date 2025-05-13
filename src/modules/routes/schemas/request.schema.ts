import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RequestDocument = HydratedDocument<Request>;
@Schema({ timestamps: true })
export class Request {
  @Prop({ required: true, ref: 'User' })
  userId: string; // Người gửi yêu cầu

  @Prop({ required: true, ref: 'Route' })
  routeId: string; // Tuyến đường được yêu cầu

  @Prop({ required: true, default: 'pending' })
  status: string; // Trạng thái: pending, accepted, rejected

  @Prop()
  message?: string; // Tin nhắn kèm theo (tùy chọn)

  @Prop()
  declare createdAt: Date;
}

export const RequestSchema = SchemaFactory.createForClass(Request);
