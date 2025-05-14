import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';
import { Route, RouteSchema } from '@/modules/routes/schemas/routes.schema';
import {
  Request,
  RequestSchema,
} from '@/modules/routes/schemas/request.schema';
import { NotificationService } from '@/modules/routes/notification.service';
import { MailModule } from '@/modules/mail/mail.module';
import {
  Notification,
  NotificationSchema,
} from '@/modules/routes/schemas/notification.schema';
import { User, UserSchema } from '@/modules/users/schemas/user.schema';
import {
  Passenger,
  PassengerSchema,
} from '@/modules/routes/schemas/Passenger.schema';
import { ChatModule } from '@/modules/chat/chat.module';

@Module({
  imports: [
    ChatModule,
    MailModule,
    MongooseModule.forFeature([
      { name: Route.name, schema: RouteSchema },
      { name: Request.name, schema: RequestSchema },
      { name: Notification.name, schema: NotificationSchema },
      {
        name: Passenger.name,
        schema: PassengerSchema,
      },
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
  ],
  controllers: [RoutesController],
  providers: [RoutesService, NotificationService],
})
export class RoutesModule {}
