import { RequestStatus } from '@/common/enums/request-status.enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RequestDocument = HydratedDocument<Request>;
@Schema({ timestamps: true })
export class Request {
  declare _id: string;
  @Prop({ required: true, ref: 'User' })
  userId: string; // Người gửi yêu cầu

  @Prop({ required: true, ref: 'Route' })
  routeId: string; // Tuyến đường được yêu cầu

  @Prop({
    required: true,
    enum: Object.values(RequestStatus),
    default: 'pending',
  })
  status: string;

  @Prop()
  message?: string; // Tin nhắn kèm theo (tùy chọn)

  @Prop()
  declare createdAt: Date;

  @Prop({ type: Number, required: true, min: 1 })
  seats: number;
}

export const RequestSchema = SchemaFactory.createForClass(Request);
