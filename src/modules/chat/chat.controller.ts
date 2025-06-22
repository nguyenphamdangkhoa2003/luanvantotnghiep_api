import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Req,
  BadRequestException,
  Query,
  Res,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from '@/modules/chat/DTOs/send-message.dto';
import { TypingIndicatorDto } from '@/modules/chat/DTOs/typing-indicator.dto';
import { AuthRequest } from '@/types';
import { PusherService } from './pusher.service';
import { ChatAuthDto } from '@/modules/chat/DTOs/chat-auth.dto';
import { Public } from '@/modules/auth/decorators/public.decorators';
import { Response } from 'express';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly pusherService: PusherService,
  ) {}

  @Post('send')
  async sendMessage(
    @Body() sendMessageDto: SendMessageDto,
    @Req() req: AuthRequest,
  ) {
    const userId = req.user._id;
    return this.chatService.sendMessage(userId, sendMessageDto);
  }

  @Get('messages/:conversationId')
  async getMessages(
    @Param('conversationId') conversationId: string,
    @Req() req: AuthRequest,
  ) {
    const userId = req.user._id;
    return this.chatService.getMessages(userId, conversationId);
  }

  @Post('auth')
  async authenticatePusher(
    @Body() body: ChatAuthDto,
    @Req() req: AuthRequest,
    @Res() res: Response, // Thêm Response để kiểm soát status code
  ) {
    const { socket_id, channel_name } = body;
    const userId = req.user?._id;

    if (!socket_id || !channel_name) {
      throw new BadRequestException('Missing socket_id or channel_name');
    }

    if (channel_name.startsWith('private-')) {
      const conversationId = channel_name.replace('private-', '');
      const conversation =
        await this.chatService.checkConversationExists(conversationId);
      this.chatService.checkConversationAuthorization(conversation, userId);
      const auth = await this.pusherService.authenticate(
        socket_id,
        channel_name,
      );
      return res.status(200).json(auth); // Đặt status 200 và trả về JSON
    } else if (channel_name.startsWith('presence-')) {
      const userData = {
        user_id: userId.toString(),
        user_info: { name: req.user?.name },
      };
      const auth = await this.pusherService.authenticate(
        socket_id,
        channel_name,
        userData,
      );
      return res.status(200).json(auth); // Đặt status 200 và trả về JSON
    } else {
      throw new BadRequestException('Unsupported channel type');
    }
  }

  @Post('typing')
  async handleTyping(
    @Body() typingIndicatorDto: TypingIndicatorDto,
    @Req() req: AuthRequest,
  ) {
    const userId = req.user._id;
    await this.chatService.handleTyping(
      userId,
      typingIndicatorDto.conversationId,
      typingIndicatorDto.isTyping,
    );
    return { status: 'success' };
  }

  @Get('conversations')
  async getUserConversations(@Req() req: AuthRequest) {
    const userId = req.user._id;
    return this.chatService.getConversationsByUserId(userId);
  }
}
