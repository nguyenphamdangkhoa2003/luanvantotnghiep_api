import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Conversation,
  ConversationDocument,
} from './schemas/conversation.schema';
import { Message, MessageDocument } from './schemas/message.schema';
import { NotificationService } from '../routes/notification.service';
import { SendMessageDto } from '@/modules/chat/DTOs/send-message.dto';
import { MailService } from '@/modules/mail/mail.service';
import { User, UserDocument } from '@/modules/users/schemas/user.schema';
import { Mode } from 'fs';
import { Route, RouteDocument } from '@/modules/routes/schemas/routes.schema';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Route.name) private routeModel: Model<RouteDocument>,
    private notificationService: NotificationService,
    private mailService: MailService,
  ) {}

  // Tạo cuộc trò chuyện khi yêu cầu được chấp nhận
  async createConversation(
    requestId: string,
    ownerId: string,
    passengerId: string,
    routeId: string,
  ): Promise<Conversation> {
    const conversation = new this.conversationModel({
      ownerId,
      passengerId,
      requestId,
      routeId,
    });
    return conversation.save();
  }

  // Gửi tin nhắn
  async sendMessage(
    userId: string,
    sendMessageDto: SendMessageDto,
  ): Promise<Message> {
    const { conversationId, content } = sendMessageDto;

    // Kiểm tra cuộc trò chuyện tồn tại và populate các thông tin cần thiết
    const conversation = (await this.conversationModel
      .findById(conversationId)
      .populate([
        { path: 'ownerId', select: 'name email' },
        { path: 'passengerId', select: 'name email' },
        { path: 'routeId', select: 'name' },
      ])
      .exec()) as any;
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Kiểm tra quyền: Chỉ chủ xe hoặc hành khách được nhắn
    if (
      conversation.ownerId._id.toString() !== userId &&
      conversation.passengerId._id.toString() !== userId
    ) {
      throw new ForbiddenException(
        'You are not authorized to send messages in this conversation',
      );
    }

    // Tạo tin nhắn
    const message = new this.messageModel({
      conversationId,
      senderId: userId,
      content,
      isRead: false,
    });
    await message.save();

    // Gửi thông báo in-app
    const recipientId =
      conversation.ownerId._id.toString() === userId
        ? conversation.passengerId._id
        : conversation.ownerId._id;
    const notificationMessage = `New message from ${userId} in your conversation for route ${conversation.routeId.name}.`;
    await this.notificationService.createNotification(
      recipientId,
      conversation.requestId,
      notificationMessage,
    );

    // Gửi email
    const sender = await this.userModel.findById(userId).select('name').exec();
    if (!sender) throw new NotFoundException('Sender not found');

    const recipient =
      conversation.ownerId._id.toString() === userId
        ? conversation.passengerId
        : conversation.ownerId;

    await this.mailService.sendMail(
      recipient.email,
      'New Message',
      'new-message-notification',
      {
        recipientName: recipient.name,
        routeName: conversation.routeId.name,
        messageContent: content,
        senderName: sender.name,
        appUrl: 'https://xeshare.com', // Thay bằng URL thực tế
        conversationId: conversationId,
        year: new Date().getFullYear(),
      },
    );

    return message;
  }

  async getMessages(
    userId: string,
    conversationId: string,
  ): Promise<Message[]> {
    const conversation = await this.conversationModel
      .findById(conversationId)
      .exec();
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (
      conversation.ownerId.toString() !== userId &&
      conversation.passengerId.toString() !== userId
    ) {
      throw new ForbiddenException(
        'You are not authorized to view this conversation',
      );
    }

    return this.messageModel
      .find({ conversationId })
      .sort({ createdAt: 1 })
      .exec();
  }

  async markAsRead(conversationId: string, userId: string) {
    await this.messageModel
      .updateMany(
        { conversationId, senderId: { $ne: userId }, isRead: false },
        { isRead: true },
      )
      .exec();
  }
}
