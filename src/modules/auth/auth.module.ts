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
import { RefreshTokenService } from '@/modules/refresh-token/refresh-token.service';
import { RefreshTokenModule } from '@/modules/refresh-token/refresh-token.module';
import { MongooseModule } from '@nestjs/mongoose';
import {
  RefreshToken,
  RefreshTokenSchema,
} from '@/modules/refresh-token/schema/refresh-token.schema';

@Module({
  imports: [
    PassportModule.register({ session: true }),
    UsersModule,
    MongooseModule.forFeature([
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]),
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        global: true,
        secret: configService.get<string>('jwt.secret'),
        signOptions: { expiresIn: configService.get<string>('jwt.expire_in') },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    SessionSerializer,
    AuthenticatedGuard,
    RefreshTokenService,
  ],
})
export class AuthModule {}
