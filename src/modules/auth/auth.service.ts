import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './interfaces/types';
import { UsersService } from '../users/users.service';
import { SignInDto, SignInResponseDto } from 'src/modules/auth/Dto/signin.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name, { timestamp: true });
  constructor(
    private readonly usersService: UsersService,
    private jwtService: JwtService,
  ) {}
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
    const responseData: SignInResponseDto = {
      user,
      access_token,
    };
    return responseData;
  }
}
