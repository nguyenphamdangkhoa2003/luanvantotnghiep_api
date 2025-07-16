import { Notification } from '@/modules/routes/schemas/notification.schema';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<Notification>, // Inject Notification model từ Mongoose
  ) {}

  /**
   * Tạo thông báo mới cho người nhận.
   *
   * @param recipientId - ID của người nhận thông báo
   * @param requestId - ID của yêu cầu liên quan
   * @param message - Nội dung thông báo
   * @returns Notification đã được lưu vào database
   */
  async createNotification(
    recipientId: string,
    requestId: string,
    message: string,
  ): Promise<Notification> {
    const notification = new this.notificationModel({
      recipientId,
      requestId,
      message,
      isRead: false, // Mặc định thông báo chưa đọc
    });

    return await notification.save();
  }
}
