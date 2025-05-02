import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '@/modules/auth/auth.service';
import { AuthenticatedGuard } from '@/modules/auth/guard/authenticated.guard';
import { LocalAuthGuard } from '@/modules/auth/guard/local-strategy.guard';
import { CreateUserDto } from '@/modules/users/dto/create-user.dto';
import { ApiResponse, AuthRequest } from '@/types';
import { UserToken } from '@/modules/auth/interfaces/types';
import { RefreshTokenDto } from '@/modules/auth/dto/refresh-token.dto';
import { Public } from '@/modules/auth/decorators/public.decorators';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name, {
    timestamp: true,
  });
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('signin')
  async signIn(@Req() req: AuthRequest): Promise<ApiResponse<UserToken>> {
    if (!req.user || !req.user.email || !req.user._id) {
      throw new UnauthorizedException('User not authenticated');
    }
    const data = await this.authService.generateUserToken({
      userId: req.user._id,
      email: req.user.email,
    });
    return {
      message: 'success',
      code: 200,
      data,
    };
  }

  @Public()
  @Post('signup')
  async signup(@Body() data: CreateUserDto) {
    return this.authService.signup(data);
  }

  @Get('profile')
  getProfile(@Req() request: Request) {
    return request.user;
  }

  @UseGuards(LocalAuthGuard)
  @Post('logout')
  logout(@Req() req: Request) {
    console.log('working ....');
    return req.logout((err) => {
      if (err) {
        throw new Error('Logout failed');
      }
    });
  }

  @Post('refresh-token')
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto.token);
  }
}
