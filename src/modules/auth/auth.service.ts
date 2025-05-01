import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './interfaces/types';
import { UsersService } from '../users/users.service';
import { SignInDto } from 'src/modules/auth/dto/signin.dto';
import { SignInDao } from 'src/modules/auth/dao/signin.dao';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name, { timestamp: true });
  constructor(
    private readonly usersService: UsersService,
    private jwtService: JwtService,
  ) {}
  async validateUser({ username, password }: SignInDto) {
    const user = await this.usersService.findOne(username, true);
    if (!user) {
      this.logger.error(`🚨 Login failed: User username} not found`);
      throw new UnauthorizedException(
        'Tài khoản hoặc mật khẩu không chính xác',
      );
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      this.logger.error(`🚨 Login failed: Incorrect password for username}`);
      throw new UnauthorizedException(
        'Tài khoản hoặc mật khẩu không chính xác',
      );
    }
    return user;
  }
  async signIn(signInData: SignInDto): Promise<{ access_token: string }> {
    const user = await this.usersService.findOne(signInData.username, true);
    if (!user) {
      this.logger.error(
        `🚨 Login failed: User ${signInData.username} not found`,
      );
      throw new UnauthorizedException(
        'Tài khoản hoặc mật khẩu không chính xác',
      );
    }

    const match = await bcrypt.compare(signInData.password, user.password);
    if (!match) {
      this.logger.error(
        `🚨 Login failed: Incorrect password for ${signInData.username}`,
      );
      throw new UnauthorizedException(
        'Tài khoản hoặc mật khẩu không chính xác',
      );
    }

    const payload: JwtPayload = { sub: user._id, username: user.username };
    const access_token = await this.jwtService.signAsync(payload);
    this.logger.log(`🚀 User ${signInData.username} signed in successfully`);
    const responseData: SignInDao = {
      user,
      access_token,
    };
    return responseData;
  }
}
