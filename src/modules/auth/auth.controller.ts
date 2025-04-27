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
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';
import { LocalAuthGuard } from 'src/modules/auth/local-strategy.guard';

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

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() request: Request) {
    return request.user;
  }
}
