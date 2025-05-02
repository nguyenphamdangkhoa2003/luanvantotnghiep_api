import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '@/modules/users/users.service';
import { LoginUserDto } from '@/modules/auth/dto/login-user.dto';
import { CreateUserDto } from '@/modules/users/dto/create-user.dto';
import { JwtPayload, UserToken } from './interfaces/types';
import { ApiResponse } from '@/types';
import { User } from '@/modules/users/schemas/user.schema';
import { RefreshTokenService } from '@/modules/refresh-token/refresh-token.service';
import { Types } from 'mongoose';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name, { timestamp: true });
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  async signIn(signInData: LoginUserDto): Promise<ApiResponse<UserToken>> {
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
    const token = await this.generateUserToken({
      userId: user._id,
      email: user.email,
    });
    this.logger.log(`🚀 User ${signInData.email} signed in successfully`);

    return {
      message: 'success',
      code: 200,
      data: token,
    };
  }

  async signup(
    data: CreateUserDto,
  ): Promise<ApiResponse<Omit<User, 'password'>>> {
    const { email } = data;

    const emailInUse = await this.usersService.findOne({ email });

    if (emailInUse) {
      throw new BadRequestException('Email đã được sử dụng');
    }

    const user = await this.usersService.create(data);
    return {
      message: 'success',
      code: 201,
      data: user,
    };
  }

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
      console.log(match);
      this.logger.error(`🚨 Login failed: Incorrect password for ${email}`);
      throw new UnauthorizedException(
        'Tài khoản hoặc mật khẩu không chính xác',
      );
    }
    return user;
  }
  async refreshTokens(refreshToken: string) {
    const token = await this.refreshTokenService.findOneAndDelete(refreshToken);

    if (!token) {
      throw new UnauthorizedException('Token không hợp lệ');
    }

    const user = await this.usersService.findOne({ _id: token.userId });

    if (!user)
      throw new NotFoundException(
        `Không tìm thấy người dùng với #id: ${token.userId}`,
      );

    return this.generateUserToken({ userId: token.userId, email: user.email });
  }
  async generateUserToken({
    userId,
    email,
  }: {
    userId: Types.ObjectId;
    email: string;
  }): Promise<UserToken> {
    const payload: JwtPayload = { sub: userId, email };
    const access_token = await this.jwtService.signAsync(payload);
    const refresh_token = crypto.randomUUID();

    await this.refreshTokenService.create({ userId, token: refresh_token });
    return {
      access_token,
      refresh_token,
    };
  }
}
