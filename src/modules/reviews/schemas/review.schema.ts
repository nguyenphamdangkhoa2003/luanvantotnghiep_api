// review.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';

export type ReviewDocument = HydratedDocument<Review>;

@Schema({ timestamps: true })
export class Review {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  reviewer: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  reviewee: string;

  @Prop({ type: Types.ObjectId, ref: 'Request', required: true })
  tripRequest: string;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ default: '' })
  comment: string;

  @Prop({ enum: ['driver', 'customer'], required: true })
  reviewType: string;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

ReviewSchema.index({ reviewer: 1, tripRequest: 1, reviewType: 1 });
ReviewSchema.index({ reviewee: 1 });
