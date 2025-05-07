import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@/modules/auth/decorators/public.decorators';
import { JwtAuthService } from '@/modules/jwt-auth/jwt-auth.service';
import { TokenTypeEnum } from '@/modules/jwt-auth/enums/types';
import { IAccessToken } from '@/modules/jwt-auth/interfaces/access-token.interface';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtAuthService: JwtAuthService,
    private configService: ConfigService,
    private reflector: Reflector, // Inject Reflector để kiểm tra metadata
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

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException(
        'Không tìm thấy access token trong header',
      );
    }

    try {
      const payload = await this.jwtAuthService.verifyToken<IAccessToken>(
        token,
        TokenTypeEnum.ACCESS,
      );
      request.user = payload;
    } catch (e) {
      Logger.error(e.message);
      throw new UnauthorizedException(e.message);
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
