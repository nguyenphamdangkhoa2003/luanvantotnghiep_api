import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type ConversationDocument = HydratedDocument<Conversation>;

@Schema({ timestamps: true })
export class Conversation {
  declare _id: string;

  @Prop({ required: true, ref: 'User' })
  ownerId: string; // Chủ xe

  @Prop({ required: true, ref: 'User' })
  passengerId: string; // Hành khách

  @Prop({ required: true, ref: 'Request' })
  requestId: string; // Yêu cầu được chấp nhận

  @Prop({ required: true, ref: 'Route' })
  routeId: string; // Tuyến đường
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
