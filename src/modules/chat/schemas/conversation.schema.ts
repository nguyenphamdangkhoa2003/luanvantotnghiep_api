import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type ConversationDocument = HydratedDocument<Conversation>;

@Schema({ timestamps: true })
export class Conversation {
  declare _id: string;

  @Prop({ required: true, ref: 'User' })
  ownerId: string;

  @Prop({ required: true, ref: 'User' })
  passengerId: string;

  @Prop({ required: true, ref: 'Request' })
  requestId: string; 

  @Prop({ required: true, ref: 'Route' })
  routeId: string; 
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
