import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '@/modules/users/schemas/user.schema';
import { CommonService } from '@/modules/common/common.service';
import { OAuthProvider } from '@/modules/auth/schemas/oauth-provider.schema';
import { OAuthProviderSchema } from '../auth/schemas/oauth-provider.schema';
import { UsersController } from './users.controller';
import { JwtAuthService } from '@/modules/jwt-auth/jwt-auth.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      {
        name: OAuthProvider.name,
        schema: OAuthProviderSchema,
      },
    ]),
  ],
  providers: [UsersService, CommonService, JwtAuthService],
  exports: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}
