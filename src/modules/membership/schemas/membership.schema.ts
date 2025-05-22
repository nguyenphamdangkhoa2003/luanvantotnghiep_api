import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';


export type MembershipDocument = HydratedDocument<Membership>;

@Schema({ timestamps: true })
export class Membership {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: ['Basic', 'Premium', 'Pro'] })
  packageType: string;

  @Prop({ required: true })
  acceptRequests: number;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  durationDays: number;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ default: 'active', enum: ['active', 'expired', 'cancelled'] })
  status: string;
}

export const MembershipSchema = SchemaFactory.createForClass(Membership);

// Update User schema to include membership info
@Schema({ timestamps: true })
export class User extends Document {
  // Existing fields: username, email, etc.

  @Prop({
    type: { packageType: String, remainingRequests: Number, endDate: Date },
  })
  currentMembership: {
    packageType: string;
    remainingRequests: number;
    endDate: Date;
  };
}

export const UserSchema = SchemaFactory.createForClass(User);
