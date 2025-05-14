import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type MessageDocument = HydratedDocument<Message>;

@Schema({ timestamps: true })
export class Message {
  @Prop({ required: true, ref: 'Conversation' })
  conversationId: string; // Cuộc trò chuyện

  @Prop({ required: true, ref: 'User' })
  senderId: string; // Người gửi

  @Prop({ required: true })
  content: string; // Nội dung tin nhắn

  @Prop({ default: false })
  isRead: boolean; // Trạng thái đã đọc
}

export const MessageSchema = SchemaFactory.createForClass(Message);
