import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from '@/modules/users/users.service';
import { IAuthResult } from './interfaces/types';
import { ApiResponse, IMessage } from '@/types';
import { User, UserDocument } from '@/modules/users/schemas/user.schema';
import { MailService } from '@/modules/mail/mail.service';
import { JwtAuthService } from '@/modules/jwt-auth/jwt-auth.service';
import { TokenTypeEnum } from '@/modules/jwt-auth/enums/types';
import { SignUpDto } from '@/modules/auth/dto/sign-up.dto';
import { SignInDto } from '@/modules/auth/dto/sign-in.dto';
import { isEmail, isStrongPassword } from 'class-validator';
import { SLUG_REGEX } from '@/common/constants/regex.constant';
import * as dayjs from 'dayjs';
import { Credentials } from '@/modules/users/schemas/credentials.schema';
import { IRefreshToken } from '@/modules/jwt-auth/interfaces/refresh-token.interface';
import { EmailDto } from '@/modules/auth/dto/email.dto';
import { isNull, isUndefined } from '@/common/utils/validation.util';
import { ResetPasswordDto } from '@/modules/auth/dto/reset-password.dto';
import { IEmailToken } from '@/modules/jwt-auth/interfaces/email-token.interface';
import { ChangePasswordDto } from '@/modules/auth/dto/change-password.dto';
import * as crypto from 'crypto';
import { ConfirmEmailDto } from '@/modules/auth/dto/confirm-email.dto';
import { RefreshTokenDto } from '@/modules/auth/dto/refresh-token.dto';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { CommonService } from '@/modules/common/common.service';
import { OAuthProvidersEnum } from '@/common/enums/oauth-providers.enum';
import { OAuthProvider } from './schemas/oauth-provider.schema';
import { SignInByGoogleDto } from './dto/sign-in-by-google.dto';
import { setCookies } from '@/common/utils/cookie.utils';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name, { timestamp: true });

  constructor(
    private readonly commonService: CommonService,
    private readonly usersService: UsersService,
    private readonly jwtAuthService: JwtAuthService,
    private readonly mailService: MailService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  public generateMessage(message: string): IMessage {
    return { id: crypto.randomUUID(), message };
  }

  public async validateUser({
    emailOrUsername,
    password,
  }: SignInDto): Promise<UserDocument> {
    const user = await this.userByEmailOrUsername(emailOrUsername);

    if (!(await bcrypt.compare(password, user.password))) {
      await this.checkLastPassword(user.credentials, password);
    }

    if (!user.isEmailVerified) {
      const confirmationToken = await this.jwtAuthService.generateToken(
        user,
        TokenTypeEnum.CONFIRMATION,
      );
      await this.mailService.sendConfirmationEmail(user, confirmationToken);
      throw new UnauthorizedException(
        this.generateMessage(
          'Vui lòng xác nhận email của bạn, một email mới đã được gửi',
        ),
      );
    }

    this.logger.log(`Người dùng ${user.email} đã được xác thực thành công`);
    return user;
  }

  public async validateEmailUser(data: SignInByGoogleDto) {
    const user = await this.usersService.findOrCreate({
      email: data.email,
      name: data.name,
      provider: OAuthProvidersEnum.GOOGLE,
      isEmailVerified: true,
      avatar: data.avatar,
    });
    return user;
  }
  public async confirmEmail({ token }: ConfirmEmailDto): Promise<IMessage> {
    if (!token) {
      throw new BadRequestException(
        this.generateMessage('Token xác nhận không được cung cấp'),
      );
    }

    const { id, version } = await this.jwtAuthService.verifyToken<IEmailToken>(
      token,
      TokenTypeEnum.CONFIRMATION,
    );

    const user = await this.usersService.findOneByCredentials(id, version);
    if (!user) {
      throw new NotFoundException(
        this.generateMessage('Người dùng không tồn tại'),
      );
    }

    if (user.isEmailVerified) {
      throw new BadRequestException(
        this.generateMessage('Email đã được xác nhận'),
      );
    }

    await this.usersService.updateEmailVerified(id, true);

    this.logger.log(`Email của người dùng ${user.email} đã được xác nhận`);
    return this.generateMessage('Xác nhận email thành công');
  }

  private async checkLastPassword(
    credentials: Credentials,
    password: string,
  ): Promise<void> {
    const { lastPassword, passwordUpdatedAt } = credentials;

    if (
      lastPassword.length === 0 ||
      !(await bcrypt.compare(password, lastPassword))
    ) {
      throw new UnauthorizedException(
        this.generateMessage('Thông tin đăng nhập không hợp lệ'),
      );
    }

    const now = dayjs();
    const time = dayjs.unix(passwordUpdatedAt);
    const months = now.diff(time, 'month');
    const message = 'Bạn đã thay đổi mật khẩu ';

    if (months > 0) {
      throw new UnauthorizedException(
        this.generateMessage(
          message + months + (months > 1 ? ' tháng trước' : ' tháng trước'),
        ),
      );
    }

    const days = now.diff(time, 'day');
    if (days > 0) {
      throw new UnauthorizedException(
        this.generateMessage(
          message + days + (days > 1 ? ' ngày trước' : ' ngày trước'),
        ),
      );
    }

    const hours = now.diff(time, 'hour');
    if (hours > 0) {
      throw new UnauthorizedException(
        this.generateMessage(
          message + hours + (hours > 1 ? ' giờ trước' : ' giờ trước'),
        ),
      );
    }

    throw new UnauthorizedException(this.generateMessage(message + 'gần đây'));
  }

  private async userByEmailOrUsername(
    emailOrUsername: string,
  ): Promise<UserDocument> {
    if (emailOrUsername.includes('@')) {
      if (!isEmail(emailOrUsername)) {
        throw new BadRequestException(
          this.generateMessage('Email không hợp lệ'),
        );
      }
      const user = await this.usersService.findOneByEmail(emailOrUsername);
      if (!user) {
        throw new NotFoundException(
          this.generateMessage('Không tìm thấy người dùng'),
        );
      }
      return user;
    }

    if (
      emailOrUsername.length < 3 ||
      emailOrUsername.length > 106 ||
      !SLUG_REGEX.test(emailOrUsername)
    ) {
      throw new BadRequestException(
        this.generateMessage('Tên người dùng không hợp lệ'),
      );
    }

    const user = await this.usersService.findOneByUsername(
      emailOrUsername,
      true,
    );
    if (!user) {
      throw new NotFoundException(
        this.generateMessage('Không tìm thấy người dùng'),
      );
    }
    return user;
  }

  public async signUp(dto: SignUpDto, domain?: string): Promise<ApiResponse> {
    const { name, email, password1, password2 } = dto;
    this.comparePasswords(password1, password2);
    if (!isStrongPassword(password1)) {
      throw new BadRequestException('Mật khẩu không đủ mạnh');
    }
    const user = await this.usersService.create(OAuthProvidersEnum.LOCAL, {
      email,
      name,
      password: password1,
      provider: OAuthProvidersEnum.LOCAL,
    });
    const confirmationToken = await this.jwtAuthService.generateToken(
      user,
      TokenTypeEnum.CONFIRMATION,
      domain,
    );
    await this.mailService.sendConfirmationEmail(user, confirmationToken);

    this.logger.log(`Người dùng mới ${email} đã đăng ký thành công`);
    return {
      code: 200,
      data: user,
      message: 'Đăng ký thành công',
    };
  }

  private comparePasswords(password1: string, password2: string): void {
    if (password1 !== password2) {
      throw new BadRequestException(
        this.generateMessage('Mật khẩu không khớp'),
      );
    }
  }

  public async refreshTokenAccess({
    refreshToken,
    domain,
  }: RefreshTokenDto): Promise<any> {
    const { id, version, tokenId } =
      await this.jwtAuthService.verifyToken<IRefreshToken>(
        refreshToken,
        TokenTypeEnum.REFRESH,
      );

    await this.checkIfTokenIsBlacklisted(id, tokenId);
    const user = await this.usersService.findOneByCredentials(id, version);
    if (!user) {
      throw new UnauthorizedException(
        this.generateMessage('Người dùng không tồn tại'),
      );
    }

    const [accessToken, newRefreshToken] =
      await this.jwtAuthService.generateAuthTokens(user, domain, tokenId);
    this.logger.log(`Đã làm mới token cho người dùng ${user.email}`);
    return [accessToken, newRefreshToken];
  }

  public async checkIfTokenIsBlacklisted(
    userId: string,
    tokenId: string,
  ): Promise<void> {
    const time = await this.cacheManager.get<number>(
      `blacklist:${userId}:${tokenId}`,
    );

    if (!isUndefined(time) && !isNull(time)) {
      throw new UnauthorizedException('Token không hợp lệ');
    }
  }

  public async logout(refreshToken: string): Promise<IMessage> {
    const { id, tokenId, exp } =
      await this.jwtAuthService.verifyToken<IRefreshToken>(
        refreshToken,
        TokenTypeEnum.REFRESH,
      );
    await this.blacklistToken(id, tokenId, exp);
    this.logger.log(`Người dùng ${id} đã đăng xuất thành công`);
    return this.generateMessage('Đăng xuất thành công');
  }

  private async blacklistToken(
    userId: string,
    tokenId: string,
    exp: number,
  ): Promise<void> {
    const now = dayjs().unix();
    const ttl = (exp - now) * 1000;

    if (ttl > 0) {
      await this.commonService.throwInternalError(
        this.cacheManager.set(`blacklist:${userId}:${tokenId}`, now, ttl),
      );
    }

    console.log(`blacklist:${userId}:${tokenId}`);
  }

  public async resetPasswordEmail(
    dto: EmailDto,
    domain?: string,
  ): Promise<IMessage> {
    const user = await this.usersService.uncheckedUserByEmail(dto.email);

    if (!isUndefined(user) && !isNull(user)) {
      const resetToken = await this.jwtAuthService.generateToken(
        user,
        TokenTypeEnum.RESET_PASSWORD,
        domain,
      );

      await this.mailService.sendResetPasswordEmail(user, resetToken);
      this.logger.log(`Đã gửi email đặt lại mật khẩu cho ${dto.email}`);
    }

    return this.generateMessage('Email đặt lại mật khẩu đã được gửi');
  }

  public async resetPassword(dto: ResetPasswordDto): Promise<ApiResponse> {
    const { password1, password2, resetToken } = dto;
    const { id, version } = await this.jwtAuthService.verifyToken<IEmailToken>(
      resetToken,
      TokenTypeEnum.RESET_PASSWORD,
    );

    this.comparePasswords(password1, password2);
    await this.usersService.resetPassword({
      userId: id,
      password: password1,
      version,
    });
    return {
      code: 200,
      message: 'Đặt lại mật khẩu thành công',
    };
  }

  public async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<[string, string]> {
    const { password1, password2, password } = dto;
    this.comparePasswords(password1, password2);

    const user = await this.usersService.updatePassword(
      {
        newPassword: password2,
        oldPassword: password,
      },
      userId,
    );
    const [accessToken, refreshToken] =
      await this.jwtAuthService.generateAuthTokens(user);

    this.logger.log(`Mật khẩu của người dùng ${userId} đã được thay đổi`);
    return [accessToken, refreshToken];
  }

  async loginByGoogle(user: any) {
    const [accessToken, refreshToken] =
      await this.jwtAuthService.generateAuthTokens(user);

    this.logger.log(`Người dùng ${user.email} đăng nhập thành công`);
    return [accessToken, refreshToken];
  }
}
