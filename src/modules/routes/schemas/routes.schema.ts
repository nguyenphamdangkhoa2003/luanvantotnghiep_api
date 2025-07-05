import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RouteDocument = HydratedDocument<Route>;

@Schema()
export class Waypoint {
  @Prop({ type: [Number], required: true })
  coordinates: [number, number];

  @Prop({ type: Number, required: true })
  distance: number;

  @Prop({ type: String, required: true })
  name: string;

  // ⏱️ Thêm thuộc tính thời gian ước lượng đến waypoint này
  @Prop({ type: Date, required: false })
  estimatedArrivalTime?: Date;
}

@Schema()
export class Route {
  @Prop({ required: true, ref: 'User' })
  userId: string;

  @Prop({ required: true })
  name: string;

  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  })
  startPoint: { type: string; coordinates: [number, number] };

  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  })
  endPoint: { type: string; coordinates: [number, number] };

  @Prop({ type: [Waypoint], default: [] })
  waypoints: Waypoint[];

  @Prop({
    type: {
      type: String,
      enum: ['LineString'],
      required: true,
    },
    coordinates: {
      type: [[Number]],
      required: true,
    },
  })
  path: { type: string; coordinates: [number, number][] };

  @Prop({ required: true })
  distance: number;

  @Prop({ required: true })
  duration: number;

  @Prop({ required: true })
  startTime: Date;

  @Prop({ required: true })
  endTime: Date;

  @Prop({ required: true })
  seatsAvailable: number;

  @Prop({ required: true })
  price: number;

  @Prop({ default: 'active' })
  status: string;

  @Prop({ type: Number, default: 0 })
  routeIndex: number;

  @Prop({
    type: { type: String, enum: ['LineString'], required: true },
    coordinates: { type: [[Number]], required: true },
  })
  simplifiedPath: { type: string; coordinates: [number, number][] };

  // 👤 Khoảng cách tối đa tài xế có thể rước người ngoài tuyến (tính bằng km)
  @Prop({ type: Number, default: 5 }) // ví dụ mặc định 5km
  maxPickupDistance: number;
}

export const RouteSchema = SchemaFactory.createForClass(Route);

RouteSchema.index({ startPoint: '2dsphere' });
RouteSchema.index({ endPoint: '2dsphere' });
RouteSchema.index({ path: '2dsphere' });
RouteSchema.index({ simplifiedPath: '2dsphere' });
RouteSchema.index({ 'waypoints.coordinates': '2dsphere' });
RouteSchema.index({ name: 'text' });
RouteSchema.index({ seatsAvailable: 1 });
RouteSchema.index({ price: 1 });
RouteSchema.index({ status: 1 });
RouteSchema.index({ startTime: 1 });
RouteSchema.index({ userId: 1 });
