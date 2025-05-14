import { Controller, Post, Body, Get, Param, Req } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from '@/modules/chat/DTOs/send-message.dto';
import { AuthRequest } from '@/types';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('send')
  async sendMessage(
    @Body() sendMessageDto: SendMessageDto,
    @Req() req: AuthRequest,
  ) {
    const userId = req.user._id; // Lấy từ JWT
    return this.chatService.sendMessage(userId, sendMessageDto);
  }

  @Get('messages/:conversationId')
  async getMessages(
    @Param('conversationId') conversationId: string,
    @Req() req: AuthRequest,
  ) {
    const userId = req.user._id; // Lấy từ JWT
    return this.chatService.getMessages(userId, conversationId);
  }
}
