import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import {
  Logger,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { SendMessageDto } from '@/modules/chat/DTOs/send-message.dto';
import { JwtAuthService } from '@/modules/jwt-auth/jwt-auth.service';
import { getCookies } from '@/common/utils/cookie.utils';
import { TokenTypeEnum } from '@/modules/jwt-auth/enums/types';
import { Types } from 'mongoose';
import { TypingIndicatorDto } from '@/modules/chat/DTOs/typing-indicator.dto';
import { UsersService } from '@/modules/users/users.service';
import { IAccessToken } from '@/modules/jwt-auth/interfaces/access-token.interface';

@WebSocketGateway({
  cors: { origin: '*' },
  pingInterval: 25000,
  pingTimeout: 60000,
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger = new Logger('ChatGateway');

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtAuthService: JwtAuthService,
    private readonly usersService: UsersService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(@ConnectedSocket() socket: Socket) {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) {
        throw new UnauthorizedException('No cookies provided');
      }

      const cookies = getCookies(
        { headers: { cookie: cookieHeader } } as any,
        TokenTypeEnum.ACCESS,
      );
      const token = cookies && typeof cookies === 'string' ? cookies : null;

      if (!token) {
        throw new UnauthorizedException('No access token found in cookie');
      }

      const payload = await this.jwtAuthService.verifyToken<IAccessToken>(
        token,
        TokenTypeEnum.ACCESS,
      );

      const user = await this.usersService.findOneById(payload.id);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      socket.data.userId = user._id.toString();
      socket.data.user = user;

      // Thông báo người dùng online
      await this.chatService.updateUserStatus(user._id, true);
      this.server.emit('userStatus', {
        userId: user._id,
        isOnline: true,
      });

      this.logger.log(`Client connected: ${socket.id}, User: ${user._id}`);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      socket.emit('error', { message: error.message });
      socket.disconnect();
    }
  }

  async handleDisconnect(@ConnectedSocket() socket: Socket) {
    try {
      const userId = socket.data.userId;
      if (userId) {
        // Cập nhật trạng thái offline
        await this.chatService.updateUserStatus(userId, false);
        this.server.emit('userStatus', {
          userId,
          isOnline: false,
        });
      }
      this.logger.log(`Client disconnected: ${socket.id}`);
    } catch (error) {
      this.logger.error(`Disconnect error: ${error.message}`);
    }
  }

  @SubscribeMessage('joinConversation')
  async handleJoinConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      if (!Types.ObjectId.isValid(data.conversationId)) {
        throw new BadRequestException('Invalid conversation ID');
      }

      // Kiểm tra quyền truy cập conversation
      await this.chatService.checkConversationAuthorization(
        socket.data.userId,
        data.conversationId,
      );


      socket.join(data.conversationId);
      socket.emit('joined', {
        conversationId: data.conversationId,
        message: `Joined conversation ${data.conversationId}`,
      });

      // Thông báo người dùng tham gia
      this.server.to(data.conversationId).emit('userJoined', {
        userId: socket.data.userId,
        conversationId: data.conversationId,
        timestamp: new Date(),
      });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() data: SendMessageDto,
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      if (!Types.ObjectId.isValid(data.conversationId)) {
        throw new BadRequestException('Invalid conversation ID');
      }

      const userId = socket.data.userId;
      const message = await this.chatService.sendMessage(userId, data);

      // Phát tin nhắn tới tất cả members trong conversation
      this.server.to(data.conversationId).emit('newMessage', {
        ...message,
        timestamp: new Date(),
      });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @MessageBody() data: TypingIndicatorDto,
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      if (!Types.ObjectId.isValid(data.conversationId)) {
        throw new BadRequestException('Invalid conversation ID');
      }

      // Phát sự kiện typing tới các members khác trong conversation
      socket.to(data.conversationId).emit('typing', {
        userId: socket.data.userId,
        conversationId: data.conversationId,
        isTyping: data.isTyping,
      });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('readMessage')
  async handleReadMessage(
    @MessageBody() data: { conversationId: string; messageId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      if (!Types.ObjectId.isValid(data.conversationId) || !Types.ObjectId.isValid(data.messageId)) {
        throw new BadRequestException('Invalid conversation or message ID');
      }

      await this.chatService.markAsRead(socket.data.userId, data.messageId);
      this.server.to(data.conversationId).emit('messageRead', {
        messageId: data.messageId,
        userId: socket.data.userId,
        conversationId: data.conversationId,
        timestamp: new Date(),
      });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('leaveConversation')
  async handleLeaveConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      if (!Types.ObjectId.isValid(data.conversationId)) {
        throw new BadRequestException('Invalid conversation ID');
      }

      socket.leave(data.conversationId);
      this.server.to(data.conversationId).emit('userLeft', {
        userId: socket.data.userId,
        conversationId: data.conversationId,
        timestamp: new Date(),
      });

      socket.emit('left', {
        conversationId: data.conversationId,
        message: `Left conversation ${data.conversationId}`,
      });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  }
}