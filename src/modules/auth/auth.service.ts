import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './interfaces/types';
import { UsersService } from '../users/users.service';
import { SignInDao } from 'src/modules/auth/dao/signin.dao';
import { LoginUserDto } from 'src/modules/auth/dto/login-user.dto';
import { CreateUserDto } from 'src/modules/users/dto/create-user.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name, { timestamp: true });
  constructor(
    private readonly usersService: UsersService,
    private jwtService: JwtService,
  ) {}
  async validateUser({ email, password }: LoginUserDto) {
    const user = await this.usersService.findOne({ email }, true);
    if (!user) {
      this.logger.error(`🚨 Login failed: User ${email} not found`);
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
  async signIn(signInData: LoginUserDto): Promise<{ access_token: string }> {
    const user = await this.usersService.findOne(
      { email: signInData.email },
      true,
    );
    if (!user) {
      this.logger.error(`🚨 Login failed: User ${signInData.email} not found`);
      throw new UnauthorizedException(
        'Tài khoản hoặc mật khẩu không chính xác',
      );
    }

    const match = await bcrypt.compare(signInData.password, user.password);
    if (!match) {
      this.logger.error(
        `🚨 Login failed: Incorrect password for ${signInData.email}`,
      );
      throw new UnauthorizedException(
        'Tài khoản hoặc mật khẩu không chính xác',
      );
    }

    const payload: JwtPayload = { sub: user.id, email: user.email };
    const access_token = await this.jwtService.signAsync(payload);
    this.logger.log(`🚀 User ${signInData.email} signed in successfully`);
    const responseData: SignInDao = {
      user,
      access_token,
    };
    return responseData;
  }

  async signup(data: CreateUserDto) {
    const { email } = data;

    const emailInUse = await this.usersService.findOne({ email });

    if (emailInUse) {
      throw new BadRequestException('Email  đã được sử dụng');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    await this.usersService.create({ ...data, password: hashedPassword });
  }
}
