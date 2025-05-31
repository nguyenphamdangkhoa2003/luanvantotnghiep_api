import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PackageDocument = HydratedDocument<Package>;

@Schema({ timestamps: true })
export class Package {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  acceptRequests: number;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  durationDays: number;
}

export const PackageSchema = SchemaFactory.createForClass(Package);
