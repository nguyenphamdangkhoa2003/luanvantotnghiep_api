import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

@Schema({ timestamps: true })
export class Notification  {
  @Prop({ required: true, ref: 'User' })
  recipientId: string; // Người nhận thông báo (chủ xe)

  @Prop({ required: true })
  message: string; // Nội dung thông báo

  @Prop({ required: true, ref: 'Request' })
  requestId: string; // Liên kết với yêu cầu

  @Prop({ default: false })
  isRead: boolean; // Trạng thái đã đọc
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
