import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { UsersService } from 'src/modules/users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from 'src/modules/auth/interfaces/types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name, { timestamp: true });
  constructor(
    private readonly usersService: UsersService,
    private jwtService: JwtService,
  ) {}
  async signIn(
    username: string,
    pass: string,
  ): Promise<{ access_token: string }> {
    const user = await this.usersService.findOne(username);
    if (!user) {
      this.logger.error(`🚨 Login failed: User ${username} not found`);
      throw new UnauthorizedException(
        'Tài khoản hoặc mật khẩu không chính xác',
      );
    }

    const match = await bcrypt.compare(pass, user.password);
    if (!match) {
      this.logger.error(`🚨 Login failed: Incorrect password for ${username}`);
      throw new UnauthorizedException(
        'Tài khoản hoặc mật khẩu không chính xác',
      );
    }

    const payload: JwtPayload = { sub: user._id, username: user.username };
    const access_token = await this.jwtService.signAsync(payload);
    this.logger.log(`🚀 User ${username} signed in successfully`);

    return { access_token };
  }
}
