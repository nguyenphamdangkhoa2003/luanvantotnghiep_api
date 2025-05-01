import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from 'src/modules/auth/auth.service';
import { AuthenticatedGuard } from 'src/modules/auth/guard/authenticated.guard';
import { LocalAuthGuard } from 'src/modules/auth/guard/local-strategy.guard';
import { CreateUserDto } from 'src/modules/users/dto/create-user.dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name, {
    timestamp: true,
  });
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('signin')
  signIn(@Req() req: Request) {
    return req.user;
  }

  @Post('signup')
  async signup(@Body() data: CreateUserDto) {
    return this.authService.signup(data);
  }

  @UseGuards(AuthenticatedGuard)
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
}
