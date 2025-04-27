import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Logger,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from 'src/modules/auth/auth.service';
import { SignInDto } from 'src/modules/auth/Dto/signin.dto';
import * as bcrypt from 'bcrypt';
import { AuthGuard } from 'src/modules/auth/auth.guard';
import { JwtPayload } from 'src/modules/auth/interfaces/types';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name, {
    timestamp: true,
  });
  constructor(private readonly authService: AuthService) {}

  @HttpCode(200)
  @Post('login')
  signIn(@Body() signInDto: SignInDto) {
    return this.authService.signIn(signInDto.username, signInDto.password);
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

  @UseGuards(AuthGuard)
  @Get('profile')
  getProfile(@Req() request: Request): JwtPayload {
    return request.user as JwtPayload;
  }
}
