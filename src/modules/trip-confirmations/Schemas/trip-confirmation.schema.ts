import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TripConfirmationDocument = HydratedDocument<TripConfirmation>;
@Schema({ timestamps: true })
export class TripConfirmation {
  @Prop({ type: Types.ObjectId, ref: 'TripRequest', required: true })
  tripRequestId: Types.ObjectId;

  @Prop({ default: false })
  confirmedByDriver: boolean;

  @Prop({ default: false })
  confirmedByPassenger: boolean;

  @Prop()
  notes: string;
}

export const TripConfirmationSchema =
  SchemaFactory.createForClass(TripConfirmation);
