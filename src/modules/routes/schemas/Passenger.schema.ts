import { Request } from '@/modules/routes/schemas/request.schema';
import { Route } from '@/modules/routes/schemas/routes.schema';
import { User } from '@/modules/users/schemas/user.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type PassengerDocument = HydratedDocument<Passenger>;

@Schema({ timestamps: true })
export class Passenger {
  @Prop({ required: true, ref: User.name })
  userId: string; // Người dùng được chấp nhận

  @Prop({ required: true, ref: Route.name })
  routeId: string; // Tuyến đường

  @Prop({ required: true, ref: Request.name })
  requestId: string; // Liên kết với yêu cầu gốc
}

export const PassengerSchema = SchemaFactory.createForClass(Passenger);
