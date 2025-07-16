import { getCookies, setCookies } from '@/common/utils/cookie.utils';
import { AuthService } from '@/modules/auth/auth.service';
import { Public } from '@/modules/auth/decorators/public.decorators';
import { ChangePasswordDto } from '@/modules/auth/DTOs/change-password.dto';
import { EmailDto } from '@/modules/auth/DTOs/email.dto';
import { ResetPasswordDto } from '@/modules/auth/DTOs/reset-password.dto';
import { SignUpDto } from '@/modules/auth/DTOs/sign-up.dto';
import { LocalAuthGuard } from '@/modules/auth/guard/local-strategy.guard';
import { TokenTypeEnum } from '@/modules/jwt-auth/enums/types';
import { JwtAuthService } from '@/modules/jwt-auth/jwt-auth.service';
import { ApiResponse, AuthRequest, IMessage } from '@/types';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name, {
    timestamp: true,
  });

  constructor(
    private readonly authService: AuthService,
    private readonly jwtAuthService: JwtAuthService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Đăng nhập người dùng bằng email/username + password
   * Gọi guard local-strategy để xác thực → sinh JWT → set cookie
   */
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('signin')
  async signIn(@Req() req: AuthRequest, @Res() res: Response) {
    if (!req.user || !req.user.email || !req.user._id) {
      throw new UnauthorizedException(
        this.authService.generateMessage('Người dùng chưa được xác thực'),
      );
    }

    const [accessToken, refreshToken] =
      await this.jwtAuthService.generateAuthTokens(req.user);
    this.setAuthCookies(res, accessToken, refreshToken);

    this.logger.log(`Người dùng ${req.user.email} đăng nhập thành công`);
    return res.status(HttpStatus.OK).json({
      code: HttpStatus.OK,
      message: 'Đăng nhập thành công',
      data: { user: req.user },
    });
  }

  /**
   * Điểm bắt đầu xác thực Google OAuth2
   */
  @Public()
  @UseGuards(AuthGuard('google'))
  @Get('google')
  async googleLogin() {}

  /**
   * Callback từ Google OAuth2 sau khi người dùng đồng ý đăng nhập
   * Sinh JWT và set vào cookie → redirect về frontend
   */
  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req, @Res() res: Response) {
    const [accessToken, refreshToken] = await this.authService.loginByGoogle(
      req.user,
    );
    this.setAuthCookies(res, accessToken, refreshToken);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    return res.redirect(`${frontendUrl}/?login=success`);
  }

  /**
   * Đăng ký tài khoản mới
   */
  @Public()
  @Post('signup')
  async signup(@Body() data: SignUpDto): Promise<ApiResponse> {
    const response = await this.authService.signUp(data);
    this.logger.log(`Đăng ký thành công cho email ${data.email}`);
    return response;
  }

  /**
   * Lấy thông tin người dùng đã xác thực từ request
   */
  @Get('profile')
  getProfile(@Req() request: Request) {
    if (!request.user) {
      throw new UnauthorizedException(
        this.authService.generateMessage('Không tìm thấy thông tin người dùng'),
      );
    }
    this.logger.log(`Truy xuất hồ sơ người dùng`);
    return request.user;
  }

  /**
   * Đăng xuất: xóa session, thu hồi refresh token
   */
  @Post('logout')
  async logout(@Req() req: AuthRequest): Promise<IMessage> {
    await req.logOut((err) => err && this.logger.warn(err.message));
    const refreshToken = getCookies(req, TokenTypeEnum.REFRESH);

    if (typeof refreshToken !== 'string') {
      throw new BadRequestException('Refresh token không hợp lệ');
    }

    const response = await this.authService.logout(refreshToken);
    this.logger.log(`Người dùng ${req.user?.email} đăng xuất thành công`);
    return response;
  }

  /**
   * Xác nhận email người dùng từ token gửi qua mail
   */
  @Public()
  @Get('confirm-email/:token')
  async confirmEmail(@Param('token') token: string): Promise<IMessage> {
    if (!token) {
      throw new BadRequestException(
        this.authService.generateMessage('Token xác nhận không được cung cấp'),
      );
    }
    const response = await this.authService.confirmEmail({ token });
    this.logger.log(
      `Xác nhận email thành công với token: ${token.substring(0, 10)}...`,
    );
    return response;
  }

  /**
   * Làm mới access token từ refresh token
   */
  @Public()
  @Post('refresh-token')
  async refreshToken(@Res() res: Response, @Req() req: Request) {
    const refreshToken = getCookies(req, TokenTypeEnum.REFRESH);
    if (typeof refreshToken !== 'string') {
      throw new InternalServerErrorException('Không tìm thấy refresh token');
    }

    const [accessToken, newRefreshToken] =
      await this.authService.refreshTokenAccess({ refreshToken });

    this.setAuthCookies(res, accessToken, newRefreshToken);

    this.logger.log(`Làm mới token thành công`);
    return res
      .status(HttpStatus.OK)
      .json({ message: 'Làm mới token thành công' });
  }

  /**
   * Gửi email đặt lại mật khẩu
   */
  @Public()
  @Post('reset-password-email')
  async resetPasswordEmail(@Body() data: EmailDto): Promise<IMessage> {
    if (!data.email) {
      throw new BadRequestException(
        this.authService.generateMessage('Email không được cung cấp'),
      );
    }
    const response = await this.authService.resetPasswordEmail(data);
    this.logger.log(`Gửi email đặt lại mật khẩu cho ${data.email}`);
    return response;
  }

  /**
   * Đặt lại mật khẩu bằng token
   */
  @Public()
  @Post('reset-password')
  async resetPassword(@Body() data: ResetPasswordDto): Promise<ApiResponse> {
    if (!data.password1 || !data.password2 || !data.resetToken) {
      throw new BadRequestException(
        this.authService.generateMessage(
          'Dữ liệu đặt lại mật khẩu không đầy đủ',
        ),
      );
    }
    const response = await this.authService.resetPassword(data);
    this.logger.log(`Đặt lại mật khẩu thành công`);
    return response;
  }

  /**
   * Thay đổi mật khẩu khi đã đăng nhập
   */
  @Post('change-password')
  async changePassword(
    @Body() data: ChangePasswordDto,
    @Req() req: AuthRequest,
    @Res() res: Response,
  ) {
    if (!req.user || !req.user._id) {
      throw new UnauthorizedException(
        this.authService.generateMessage('Người dùng chưa được xác thực'),
      );
    }

    if (!data.password || !data.password1 || !data.password2) {
      throw new BadRequestException(
        this.authService.generateMessage(
          'Dữ liệu thay đổi mật khẩu không đầy đủ',
        ),
      );
    }

    const [accessToken, refreshToken] = await this.authService.changePassword(
      req.user._id.toString(),
      data,
    );

    this.setAuthCookies(res, accessToken, refreshToken);
    this.logger.log(`Thay đổi mật khẩu thành công cho ${req.user.email}`);

    return res.status(HttpStatus.OK).json({
      code: HttpStatus.OK,
      message: 'Thay đổi mật khẩu thành công',
    });
  }

  /**
   * Hàm tiện ích để set access & refresh token vào cookie
   */
  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    const accessMaxAge =
      Number(this.configService.get<string>('jwt.access.time')) * 1000;
    const refreshMaxAge =
      Number(this.configService.get<string>('jwt.refresh.time')) * 1000;

    setCookies(res, [
      {
        name: TokenTypeEnum.ACCESS,
        value: accessToken,
        options: { maxAge: accessMaxAge, httpOnly: false },
      },
      {
        name: TokenTypeEnum.REFRESH,
        value: refreshToken,
        options: { maxAge: refreshMaxAge },
      },
    ]);
  }
}
