import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '@/modules/users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LocalStrategy } from '@/modules/auth/strategies/local.strategy';
import { PassportModule } from '@nestjs/passport';
import { SessionSerializer } from '@/modules/auth/session.serializer';
import { AuthenticatedGuard } from '@/modules/auth/guard/authenticated.guard';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtAuthModule } from '@/modules/jwt-auth/jwt-auth.module';
import {
  BlacklistedToken,
  BlacklistedTokenSchema,
} from '@/modules/auth/schemas/blacklisted-token.schema';

@Module({
  imports: [
    PassportModule.register({ session: true }),
    UsersModule,
    MongooseModule.forFeature([
      { name: BlacklistedToken.name, schema: BlacklistedTokenSchema },
    ]),
    JwtAuthModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    SessionSerializer,
    AuthenticatedGuard,
  ],
})
export class AuthModule {}
