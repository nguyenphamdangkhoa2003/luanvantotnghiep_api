import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Conversation,
  ConversationSchema,
} from '@/modules/chat/schemas/conversation.schema';
import { Message, MessageSchema } from '@/modules/chat/schemas/message.schema';
import { User, UserSchema } from '@/modules/users/schemas/user.schema';
import { Route, RouteSchema } from '@/modules/routes/schemas/routes.schema';
import { NotificationService } from '@/modules/routes/notification.service';
import {
  Notification,
  NotificationSchema,
} from '@/modules/routes/schemas/notification.schema';
import { ChatGateway } from './chat.gateway';
import { JwtAuthService } from '@/modules/jwt-auth/jwt-auth.service';
import { UsersService } from '@/modules/users/users.service';
import {
  OAuthProvider,
  OAuthProviderSchema,
} from '@/modules/auth/schemas/oauth-provider.schema';
import { CloudinaryService } from '@/common/services/cloudinary.service';
import { PusherService } from '@/modules/chat/pusher.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      {
        name: OAuthProvider.name,
        schema: OAuthProviderSchema,
      },
      { name: Message.name, schema: MessageSchema },
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: Route.name,
        schema: RouteSchema,
      },
      {
        name: Notification.name,
        schema: NotificationSchema,
      },
    ]),
  ],
  providers: [
    ChatService,
    NotificationService,
    ChatGateway,
    JwtAuthService,
    UsersService,
    CloudinaryService,
    PusherService,
  ],
  controllers: [ChatController],
  exports: [ChatService],
})
export class ChatModule {}
