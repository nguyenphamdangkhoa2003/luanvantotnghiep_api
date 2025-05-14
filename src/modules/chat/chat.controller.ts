import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from '@/modules/chat/DTOs/send-message.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('send')
  async sendMessage(@Body() sendMessageDto: SendMessageDto) {
    const userId = 'USER_ID_FROM_AUTH'; // Lấy từ JWT
    return this.chatService.sendMessage(userId, sendMessageDto);
  }

  @Get('messages/:conversationId')
  async getMessages(@Param('conversationId') conversationId: string) {
    const userId = 'USER_ID_FROM_AUTH'; // Lấy từ JWT
    return this.chatService.getMessages(userId, conversationId);
  }
}
