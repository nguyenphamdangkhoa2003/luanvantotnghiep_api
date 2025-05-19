import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RouteDocument = HydratedDocument<Route>;

@Schema()
export class Route {
  @Prop({ required: true, ref: 'User' })
  userId: string; // Người tạo tuyến đường

  @Prop({ required: true })
  name: string; // Tên tuyến đường (VD: "Hà Nội - Hải Phòng")

  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      required: true,
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  })
  startPoint: { type: string; coordinates: [number, number] }; // Điểm xuất phát

  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      required: true,
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  })
  endPoint: { type: string; coordinates: [number, number] }; // Điểm đến

  @Prop({
    type: [
      {
        type: {
          type: String,
          enum: ['Point'],
          required: true,
        },
        coordinates: {
          type: [Number],
          required: true,
        },
      },
    ],
    default: [],
  })
  waypoints: { type: string; coordinates: [number, number] }[]; // Các điểm dừng (tùy chọn)

  @Prop({
    type: {
      type: String,
      enum: ['LineString'],
      required: true,
    },
    coordinates: {
      type: [[Number]], // [[longitude, latitude], ...]
      required: true,
    },
  })
  path: { type: string; coordinates: [number, number][] }; // Lộ trình (tọa độ các điểm trên tuyến đường)

  @Prop({ required: true })
  distance: number; // Khoảng cách (km, lấy từ Goong API)

  @Prop({ required: true })
  duration: number; // Thời gian di chuyển (phút, lấy từ Goong API)

  @Prop({ required: true })
  frequency: string; // Tần suất (VD: "daily", "weekly")

  @Prop({ required: true })
  startTime: Date; // Thời gian bắt đầu

  @Prop({ required: true })
  seatsAvailable: number; // Số ghế trống

  @Prop({ required: true })
  price: number; // Giá mỗi người

  @Prop({ default: 'active' })
  status: string; // Trạng thái tuyến đường (active, inactive)

  @Prop({ type: Number, default: 0 }) // Lưu chỉ số lộ trình đã chọn
  routeIndex: number;
}
export const RouteSchema = SchemaFactory.createForClass(Route);

// Tạo index geospatial cho startPoint, endPoint và path để hỗ trợ tìm kiếm không gian
RouteSchema.index({
  startPoint: '2dsphere',
  endPoint: '2dsphere',
  path: '2dsphere',
});
