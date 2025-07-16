import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as dayjs from 'dayjs';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';

import { UsersService } from '@/modules/users/users.service';
import { CommonService } from '@/modules/common/common.service';
import { MailService } from '@/modules/mail/mail.service';
import { JwtAuthService } from '@/modules/jwt-auth/jwt-auth.service';

import { TokenTypeEnum } from '@/modules/jwt-auth/enums/types';
import { OAuthProvidersEnum } from '@/common/enums/oauth-providers.enum';
import { SLUG_REGEX } from '@/common/constants/regex.constant';
import { isNull, isUndefined } from '@/common/utils/validation.util';

import { SignUpDto } from '@/modules/auth/DTOs/sign-up.dto';
import { SignInDto } from '@/modules/auth/DTOs/sign-in.dto';
import { SignInByGoogleDto } from './DTOs/sign-in-by-google.dto';
import { ChangePasswordDto } from '@/modules/auth/DTOs/change-password.dto';
import { ConfirmEmailDto } from '@/modules/auth/DTOs/confirm-email.dto';
import { ResetPasswordDto } from '@/modules/auth/DTOs/reset-password.dto';
import { RefreshTokenDto } from '@/modules/auth/DTOs/refresh-token.dto';
import { EmailDto } from '@/modules/auth/DTOs/email.dto';

import { IRefreshToken } from '@/modules/jwt-auth/interfaces/refresh-token.interface';
import { IEmailToken } from '@/modules/jwt-auth/interfaces/email-token.interface';
import { ApiResponse, IMessage } from '@/types';
import { UserDocument } from '@/modules/users/schemas/user.schema';
import { Credentials } from '@/modules/users/schemas/credentials.schema';
import { isEmail, isStrongPassword } from 'class-validator';

/**
 * Service xử lý toàn bộ logic xác thực và bảo mật của người dùng.
 * Bao gồm: đăng ký, đăng nhập, xác minh email, đặt lại mật khẩu, refresh token...
 */
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

  /** Tạo object chứa message và UUID để đồng nhất định dạng lỗi */
  public generateMessage(message: string): IMessage {
    return { id: crypto.randomUUID(), message };
  }

  /**
   * Xác thực người dùng đăng nhập bằng local
   */
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

  /**
   * Đăng nhập hoặc tạo mới tài khoản Google
   */
  public async validateEmailUser(data: SignInByGoogleDto) {
    return this.usersService.findOrCreate({
      email: data.email,
      name: data.name,
      provider: OAuthProvidersEnum.GOOGLE,
      isEmailVerified: true,
      avatar: data.avatar,
    });
  }

  /**
   * Xác nhận email từ token xác thực
   */
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

  /**
   * Kiểm tra người dùng đã đổi mật khẩu gần đây chưa
   */
  private async checkLastPassword(
    credentials: Credentials,
    password: string,
  ): Promise<void> {
    const { lastPassword, passwordUpdatedAt } = credentials;
    if (
      !lastPassword.length ||
      !(await bcrypt.compare(password, lastPassword))
    ) {
      throw new UnauthorizedException(
        this.generateMessage('Thông tin đăng nhập không hợp lệ'),
      );
    }

    const time = dayjs.unix(passwordUpdatedAt);
    const now = dayjs();
    const timeDiff = [
      { value: now.diff(time, 'month'), unit: 'tháng' },
      { value: now.diff(time, 'day'), unit: 'ngày' },
      { value: now.diff(time, 'hour'), unit: 'giờ' },
    ];

    for (const { value, unit } of timeDiff) {
      if (value > 0) {
        throw new UnauthorizedException(
          this.generateMessage(
            `Bạn đã thay đổi mật khẩu ${value} ${unit} trước`,
          ),
        );
      }
    }

    throw new UnauthorizedException(
      this.generateMessage('Bạn đã thay đổi mật khẩu gần đây'),
    );
  }

  /**
   * Tìm người dùng bằng email hoặc username
   */
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
      if (!user)
        throw new NotFoundException(
          this.generateMessage('Không tìm thấy người dùng'),
        );
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
    if (!user)
      throw new NotFoundException(
        this.generateMessage('Không tìm thấy người dùng'),
      );
    return user;
  }

  /**
   * Đăng ký người dùng mới
   */
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
    return { code: 200, data: user, message: 'Đăng ký thành công' };
  }

  /** So sánh hai mật khẩu có khớp không */
  private comparePasswords(password1: string, password2: string): void {
    if (password1 !== password2) {
      throw new BadRequestException(
        this.generateMessage('Mật khẩu không khớp'),
      );
    }
  }

  /** Làm mới token từ refresh token */
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

  /** Kiểm tra refresh token đã bị thu hồi chưa */
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

  /** Thu hồi token người dùng khi logout */
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

  /** Thêm token vào danh sách thu hồi (blacklist) */
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
  }

  /** Gửi email chứa liên kết đặt lại mật khẩu */
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

  /** Đặt lại mật khẩu từ token */
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
    return { code: 200, message: 'Đặt lại mật khẩu thành công' };
  }

  /** Đổi mật khẩu khi đã đăng nhập */
  public async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<[string, string]> {
    const { password1, password2, password } = dto;
    this.comparePasswords(password1, password2);

    const user = await this.usersService.updatePassword(
      { newPassword: password2, oldPassword: password },
      userId,
    );
    const [accessToken, refreshToken] =
      await this.jwtAuthService.generateAuthTokens(user);

    this.logger.log(`Mật khẩu của người dùng ${userId} đã được thay đổi`);
    return [accessToken, refreshToken];
  }

  /** Đăng nhập bằng tài khoản Google */
  async loginByGoogle(user: any) {
    const [accessToken, refreshToken] =
      await this.jwtAuthService.generateAuthTokens(user);
    this.logger.log(`Người dùng ${user.email} đăng nhập thành công`);
    return [accessToken, refreshToken];
  }
}
