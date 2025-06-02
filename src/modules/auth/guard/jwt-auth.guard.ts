import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@/modules/auth/decorators/public.decorators';
import { JwtAuthService } from '@/modules/jwt-auth/jwt-auth.service';
import { TokenTypeEnum } from '@/modules/jwt-auth/enums/types';
import { IAccessToken } from '@/modules/jwt-auth/interfaces/access-token.interface';
import { UsersService } from '@/modules/users/users.service';
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
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthRequest>();

    let token: string | undefined;

    // Check header first
    const authHeader = request.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '');
    }

    // Fallback to cookie if no token found in header
    if (!token) {
      const cookieToken = getCookies(request, TokenTypeEnum.ACCESS);
      // Ensure cookieToken is a string
      token = typeof cookieToken === 'string' ? cookieToken : undefined;
    }

    if (!token) {
      throw new UnauthorizedException(
        'Không tìm thấy access token trong header hoặc cookie',
      );
    }

    try {
      const payload = await this.jwtAuthService.verifyToken<IAccessToken>(
        token,
        TokenTypeEnum.ACCESS,
      );
      const user = await this.userSerivce.findOneById(payload.id);
      if (!user) {
        throw new NotFoundException('Người dùng không tồn tại');
      }
      request.user = user;
    } catch (e) {
      Logger.error(e.message);
      throw new UnauthorizedException(e.message);
    }

    return true;
  }
}
