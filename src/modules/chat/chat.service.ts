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
import { PusherService } from './pusher.service';

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
    private pusherService: PusherService,
  ) {}

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

  public async checkConversationExists(
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

  private getRecipientId(conversation: any, userId: string): string {
    return conversation.ownerId._id.toString() === userId
      ? conversation.passengerId._id.toString()
      : conversation.ownerId._id.toString();
  }

  async sendMessage(
    userId: string,
    sendMessageDto: SendMessageDto,
  ): Promise<Message> {
    const { conversationId, content } = sendMessageDto;

    const conversation = (await this.checkConversationExists(conversationId, [
      { path: 'ownerId', select: 'name email' },
      { path: 'passengerId', select: 'name email' },
      { path: 'routeId', select: 'name' },
    ])) as any;

    if (
      conversation.ownerId._id.toString() !== userId.toString() &&
      conversation.passengerId._id.toString() !== userId.toString()
    ) {
      throw new ForbiddenException(
        'You are not authorized to access this conversation',
      );
    }
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

    // Gửi sự kiện newMessage qua Pusher
    await this.pusherService.trigger(
      `private-${conversationId}`,
      'newMessage',
      {
        ...message.toObject(),
        timestamp: new Date(),
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

  async markAsRead(userId: string, messageId: string): Promise<void> {
    const message = await this.messageModel.findById(messageId).exec();
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const conversation = await this.checkConversationExists(
      message.conversationId.toString(),
    );
    this.checkConversationAuthorization(conversation, userId);

    await this.messageModel
      .updateMany(
        { _id: messageId, senderId: { $ne: userId }, isRead: false },
        { isRead: true },
      )
      .exec();

    // Gửi sự kiện messageRead qua Pusher
    await this.pusherService.trigger(
      `private-${message.conversationId}`,
      'messageRead',
      {
        messageId,
        userId,
        conversationId: message.conversationId,
        timestamp: new Date(),
      },
    );
  }

  async updateUserStatus(userId: string, isOnline: boolean): Promise<void> {
    try {
      if (!userId || !Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID');
      }

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

      // Gửi sự kiện userStatus qua Pusher
      await this.pusherService.trigger('presence-users', 'userStatus', {
        userId,
        isOnline,
      });
    } catch (error) {
      Logger.error(`Failed to update user status: ${error.message}`);
      throw error;
    }
  }

  async handleTyping(
    userId: string,
    conversationId: string,
    isTyping: boolean,
  ): Promise<void> {
    const conversation = await this.checkConversationExists(conversationId);
    this.checkConversationAuthorization(conversation, userId);

    // Gửi sự kiện typing qua Pusher
    await this.pusherService.trigger(`private-${conversationId}`, 'typing', {
      userId,
      conversationId,
      isTyping,
    });
  }

  async closeConversation(conversationId: string): Promise<void> {
    const conversation = await this.checkConversationExists(conversationId);
    await this.conversationModel.deleteOne({ _id: conversationId }).exec();

    // Gửi sự kiện conversationClosed qua Pusher
    await this.pusherService.trigger(
      `private-${conversationId}`,
      'conversationClosed',
      {
        conversationId,
        timestamp: new Date(),
      },
    );
  }
}
