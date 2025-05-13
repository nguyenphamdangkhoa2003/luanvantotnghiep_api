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

@Module({
  imports: [
    MailModule,
    MongooseModule.forFeature([
      { name: Route.name, schema: RouteSchema },
      { name: Request.name, schema: RequestSchema },
      { name: Notification.name, schema: NotificationSchema },
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
