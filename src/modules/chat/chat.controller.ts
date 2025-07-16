import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Req,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from '@/modules/chat/DTOs/send-message.dto';
import { TypingIndicatorDto } from '@/modules/chat/DTOs/typing-indicator.dto';
import { AuthRequest } from '@/types';
import { PusherService } from './pusher.service';
import { ChatAuthDto } from '@/modules/chat/DTOs/chat-auth.dto';
import { Response } from 'express';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly pusherService: PusherService,
  ) {}

  /**
   * Gửi tin nhắn trong cuộc trò chuyện
   */
  @Post('send')
  async sendMessage(
    @Body() sendMessageDto: SendMessageDto,
    @Req() req: AuthRequest,
  ) {
    const userId = req.user._id;
    return this.chatService.sendMessage(userId, sendMessageDto);
  }

  /**
   * Lấy lịch sử tin nhắn của một cuộc trò chuyện
   */
  @Get('messages/:conversationId')
  async getMessages(
    @Param('conversationId') conversationId: string,
    @Req() req: AuthRequest,
  ) {
    const userId = req.user._id;
    return this.chatService.getMessages(userId, conversationId);
  }

  /**
   * Xác thực kết nối Pusher khi join vào kênh (private/presence)
   */
  @Post('auth')
  async authenticatePusher(
    @Body() body: ChatAuthDto,
    @Req() req: AuthRequest,
    @Res() res: Response,
  ) {
    const { socket_id, channel_name } = body;
    const userId = req.user?._id;

    if (!socket_id || !channel_name) {
      throw new BadRequestException('Thiếu socket_id hoặc channel_name');
    }

    // Xác thực kênh private (ví dụ: private-conversationId)
    if (channel_name.startsWith('private-')) {
      const conversationId = channel_name.replace('private-', '');
      const conversation =
        await this.chatService.checkConversationExists(conversationId);
      this.chatService.checkConversationAuthorization(conversation, userId);

      const auth = await this.pusherService.authenticate(
        socket_id,
        channel_name,
      );
      return res.status(200).json(auth);
    }

    // Xác thực kênh presence (ví dụ: presence-global)
    if (channel_name.startsWith('presence-')) {
      const userData = {
        user_id: userId.toString(),
        user_info: { name: req.user?.name },
      };

      const auth = await this.pusherService.authenticate(
        socket_id,
        channel_name,
        userData,
      );
      return res.status(200).json(auth);
    }

    // Các loại kênh không được hỗ trợ
    throw new BadRequestException('Loại channel không được hỗ trợ');
  }

  /**
   * Gửi tín hiệu đang gõ trong cuộc trò chuyện
   */
  @Post('typing')
  async handleTyping(
    @Body() typingIndicatorDto: TypingIndicatorDto,
    @Req() req: AuthRequest,
  ) {
    const userId = req.user._id;
    const { conversationId, isTyping } = typingIndicatorDto;

    await this.chatService.handleTyping(userId, conversationId, isTyping);
    return { status: 'success' };
  }

  /**
   * Lấy danh sách cuộc trò chuyện của người dùng hiện tại
   */
  @Get('conversations')
  async getUserConversations(@Req() req: AuthRequest) {
    const userId = req.user._id;
    return this.chatService.getConversationsByUserId(userId);
  }
}
