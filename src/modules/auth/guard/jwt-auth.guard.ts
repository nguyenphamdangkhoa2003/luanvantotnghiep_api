import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@/modules/auth/decorators/public.decorators';
import { JwtAuthService } from '@/modules/jwt-auth/jwt-auth.service';
import { TokenTypeEnum } from '@/modules/jwt-auth/enums/types';
import { IAccessToken } from '@/modules/jwt-auth/interfaces/access-token.interface';
import { UsersService } from '@/modules/users/users.service';
import { Types } from 'mongoose';
import { AuthRequest } from '@/types';
import { getCookies } from '@/common/utils/cookie.utils';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtAuthService: JwtAuthService,
    private configService: ConfigService,
    private userSerivce: UsersService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Kiểm tra xem route có được đánh dấu là public hay không
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true; // Bỏ qua xác thực nếu route là public
    }

    const request = context.switchToHttp().getRequest<AuthRequest>();
    const token = getCookies(request, TokenTypeEnum.ACCESS);
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException(
        'Không tìm thấy access token trong cookie',
      );
    }
    try {
      const payload = await this.jwtAuthService.verifyToken<IAccessToken>(
        token,
        TokenTypeEnum.ACCESS,
      );
      const user = await this.userSerivce.findOneById(
        new Types.ObjectId(payload.id),
      );
      if (!user) {
        throw new NotFoundException();
      }
      request.user = user;
    } catch (e) {
      Logger.error(e.message);
      throw new UnauthorizedException(e.message);
    }

    return true;
  }
}
