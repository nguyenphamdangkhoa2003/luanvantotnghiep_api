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
import * as bcrypt from 'bcrypt';
import { Request } from 'express';
import { AuthenticatedGuard } from 'src/modules/auth/guard/authenticated.guard';
import { LocalAuthGuard } from 'src/modules/auth/guard/local-strategy.guard';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name, {
    timestamp: true,
  });
  constructor() {}

  @UseGuards(LocalAuthGuard)
  @Post('signin')
  signIn(@Req() req: Request) {
    return req.user;
  }
  @Get('hash')
  async hash(@Query('str') str: string) {
    if (!str) {
      this.logger.error('🚨 Query parameter "str" is missing');
      throw new BadRequestException('Query parameter "str" is required');
    }
    this.logger.log(`🔒 Hashing string: ${str}`);
    const hash = await bcrypt.hash(str, 10);
    this.logger.log(`✅ Hash generated: ${hash.substring(0, 10)}...`);
    return { hash };
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
