import { IsNotEmpty, IsString } from 'class-validator';

// send-message.dto.ts
export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  conversationId: string; // ID cuộc trò chuyện

  @IsString()
  @IsNotEmpty()
  content: string; // Nội dung tin nhắn
}
