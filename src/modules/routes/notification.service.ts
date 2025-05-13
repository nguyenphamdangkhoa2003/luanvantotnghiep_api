import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification } from '@/modules/routes/schemas/notification.schema';
import { MailService } from '@/modules/mail/mail.service';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<Notification>,
  ) {}

  async createNotification(
    recipientId: string,
    requestId: string,
    message: string,
  ): Promise<Notification> {
    const notification = new this.notificationModel({
      recipientId,
      requestId,
      message,
      isRead: false,
    });
    return notification.save();
  }
}
