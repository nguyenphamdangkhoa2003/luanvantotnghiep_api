import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Conversation,
  ConversationDocument,
} from './schemas/conversation.schema';
import { Message, MessageDocument } from './schemas/message.schema';
import { NotificationService } from '../routes/notification.service';
import { SendMessageDto } from '@/modules/chat/DTOs/send-message.dto';
import { MailService } from '@/modules/mail/mail.service';
import { User, UserDocument } from '@/modules/users/schemas/user.schema';
import { Route, RouteDocument } from '@/modules/routes/schemas/routes.schema';
import { Logger } from '@nestjs/common';

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

  // Kiểm tra cuộc trò chuyện tồn tại
  private async checkConversationExists(
    conversationId: string,
    populateFields: { path: string; select: string }[] = [],
  ): Promise<ConversationDocument> {
    const conversation = await this.conversationModel
      .findById(conversationId)
      .populate(populateFields)
      .exec();
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    return conversation as ConversationDocument;
  }

  // Kiểm tra quyền truy cập cuộc trò chuyện
  public checkConversationAuthorization(
    conversation: ConversationDocument,
    userId: string,
  ): void {
    if (
      conversation.ownerId.toString() !== userId.toString() &&
      conversation.passengerId.toString() !== userId.toString()
    ) {
      throw new ForbiddenException(
        'You are not authorized to access this conversation',
      );
    }
  }

  // Xác định người nhận (recipient) trong cuộc trò chuyện
  private getRecipientId(conversation: any, userId: string): string {
    return conversation.ownerId._id.toString() === userId
      ? conversation.passengerId._id.toString()
      : conversation.ownerId._id.toString();
  }

  // Gửi tin nhắn
  async sendMessage(
    userId: string,
    sendMessageDto: SendMessageDto,
  ): Promise<Message> {
    const { conversationId, content } = sendMessageDto;

    // Kiểm tra cuộc trò chuyện và populate thông tin
    const conversation = (await this.checkConversationExists(conversationId, [
      { path: 'ownerId', select: 'name email' },
      { path: 'passengerId', select: 'name email' },
      { path: 'routeId', select: 'name' },
    ])) as any;

    // Kiểm tra quyền
    this.checkConversationAuthorization(conversation, userId);

    // Tạo tin nhắn
    const message = new this.messageModel({
      conversationId,
      senderId: userId,
      content,
      isRead: false,
    });
    await message.save();

    const recipientId = this.getRecipientId(conversation, userId);
    const notificationMessage = `New message from ${userId} in your conversation for route ${conversation.routeId.name}.`;
    await this.notificationService.createNotification(
      recipientId,
      conversation.requestId,
      notificationMessage,
    );

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
        appUrl: 'https://xeshare.com',
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
    const conversation = await this.checkConversationExists(conversationId);
    this.checkConversationAuthorization(conversation, userId);

    return this.messageModel
      .find({ conversationId })
      .sort({ createdAt: 1 })
      .exec();
  }

  async markAsRead(conversationId: string, userId: string) {
    const conversation = await this.checkConversationExists(conversationId);
    this.checkConversationAuthorization(conversation, userId);

    await this.messageModel
      .updateMany(
        { conversationId, senderId: { $ne: userId }, isRead: false },
        { isRead: true },
      )
      .exec();
  }

  async updateUserStatus(userId: string, isOnline: boolean): Promise<void> {
    try {
      // Kiểm tra userId hợp lệ
      if (!userId || !Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID');
      }

      // Cập nhật trạng thái online và lastSeen
      const updateData: Partial<User> = {
        isOnline,
        lastSeen: isOnline ? undefined : new Date(),
      };

      const updatedUser = await this.userModel.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, lean: true },
      );

      if (!updatedUser) {
        throw new Error(`User with ID ${userId} not found`);
      }

      Logger.log(
        `Updated user status: ID=${userId}, isOnline=${isOnline}, lastSeen=${
          isOnline ? 'null' : updateData.lastSeen
        }`,
      );
    } catch (error) {
      Logger.error(`Failed to update user status: ${error.message}`);
      throw error;
    }
  }
}
