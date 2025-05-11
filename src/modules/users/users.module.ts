import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '@/modules/users/schemas/user.schema';
import { CommonService } from '@/modules/common/common.service';
import { OAuthProvider } from '@/modules/auth/schemas/oauth-provider.schema';
import { OAuthProviderSchema } from '../auth/schemas/oauth-provider.schema';
import { UsersController } from './users.controller';
import { JwtAuthService } from '@/modules/jwt-auth/jwt-auth.service';
import { CloudinaryService } from '@/common/services/cloudinary.service';
import { MailService } from '@/modules/mail/mail.service';
import { MailModule } from '@/modules/mail/mail.module';

@Module({
  imports: [
    MailModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      {
        name: OAuthProvider.name,
        schema: OAuthProviderSchema,
      },
    ]),
  ],
  providers: [
    UsersService,
    CommonService,
    JwtAuthService,
    CloudinaryService,
    MailService,
  ],
  exports: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}
