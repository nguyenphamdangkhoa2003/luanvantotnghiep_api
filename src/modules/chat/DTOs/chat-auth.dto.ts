import { IsNotEmpty, IsString } from 'class-validator';

export class ChatAuthDto {
  @IsString()
  @IsNotEmpty()
  socket_id: string;

  @IsString()
  @IsNotEmpty()
  channel_name: string;
}
