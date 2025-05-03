import {
  BadRequestException,
  ConflictException,
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
import { IJwtPayload, IUserToken } from './interfaces/types';
import { ApiResponse } from '@/types';
import { User, UserDocument } from '@/modules/users/schemas/user.schema';
import { RefreshTokenService } from '@/modules/refresh-token/refresh-token.service';
import { Types } from 'mongoose';
import { MailService } from '@/modules/mail/mail.service';
import { CommonService } from '@/modules/common/common.service';
import { RegisterUserDto } from '@/modules/auth/dto/register-user.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name, { timestamp: true });
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly mailService: MailService,
    private readonly commonService: CommonService,
  ) {}

  async signIn(signInData: LoginUserDto): Promise<ApiResponse<IUserToken>> {
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

  public async signup(
    data: CreateUserDto,
  ): Promise<ApiResponse<Omit<User, 'password'>>> {
    const { email, name, password } = data;
    const user = await this.usersService.create(email, name, password);
    const token = Math.floor(1000 + Math.random() * 9000).toString();
    await this.mailService.sendUserConfirmation(user, token);
    return {
      message: 'success',
      code: 201,
      data: user,
    };
  }

  public async validateUser({ email, password }: LoginUserDto) {
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
  public async refreshTokens(refreshToken: string) {
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
  public async generateUserToken({
    userId,
    email,
  }: {
    userId: Types.ObjectId;
    email: string;
  }): Promise<IUserToken> {
    const payload: IJwtPayload = { sub: userId, email };
    const access_token = await this.jwtService.signAsync(payload);
    const refresh_token = crypto.randomUUID();

    await this.refreshTokenService.create({ userId, token: refresh_token });
    return {
      access_token,
      refresh_token,
    };
  }
}
