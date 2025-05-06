import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '@/modules/users/users.module';
import { LocalStrategy } from '@/modules/auth/strategies/local.strategy';
import { PassportModule } from '@nestjs/passport';
import { SessionSerializer } from '@/modules/auth/session.serializer';
import { AuthenticatedGuard } from '@/modules/auth/guard/authenticated.guard';
import { JwtAuthModule } from '@/modules/jwt-auth/jwt-auth.module';

@Module({
  imports: [
    PassportModule.register({ session: true }),
    UsersModule,
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
