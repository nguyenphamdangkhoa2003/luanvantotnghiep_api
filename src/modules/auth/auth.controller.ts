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
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '@/modules/auth/auth.service';
import { LocalAuthGuard } from '@/modules/auth/guard/local-strategy.guard';
import { ApiResponse, AuthRequest, IMessage } from '@/types';
import { Public } from '@/modules/auth/decorators/public.decorators';
import { SignUpDto } from '@/modules/auth/dto/sign-up.dto';
import { IAuthResult } from '@/modules/auth/interfaces/types';
import { LogoutDto } from '@/modules/auth/dto/logout.dto';
import { ConfirmEmailDto } from '@/modules/auth/dto/confirm-email.dto';
import { EmailDto } from '@/modules/auth/dto/email.dto';
import { ResetPasswordDto } from '@/modules/auth/dto/reset-password.dto';
import { ChangePasswordDto } from '@/modules/auth/dto/change-password.dto';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { JwtAuthService } from '@/modules/jwt-auth/jwt-auth.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name, {
    timestamp: true,
  });

  constructor(
    private readonly authService: AuthService,
    private readonly jwtAuthService: JwtAuthService,
  ) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('signin')
  async signIn(@Req() req: AuthRequest): Promise<ApiResponse<IAuthResult>> {
    if (!req.user || !req.user.email || !req.user._id) {
      throw new UnauthorizedException(
        this.authService.generateMessage('Người dùng chưa được xác thực'),
      );
    }

    const [accessToken, refreshToken] =
      await this.jwtAuthService.generateAuthTokens(req.user);

    this.logger.log(`Người dùng ${req.user.email} đăng nhập thành công`);
    return {
      code: HttpStatus.OK,
      message: 'Đăng nhập thành công',
      data: { user: req.user, accessToken, refreshToken },
    };
  }
  @Public()
  @UseGuards(AuthGuard('google'))
  @Get('google')
  async googleLogin() {}

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req) {
    const user = req.user;
    return this.authService.loginByGoogle(user);
  }

  @Public()
  @Post('signup')
  async signup(@Body() data: SignUpDto): Promise<ApiResponse> {
    const response = await this.authService.signUp(data);
    this.logger.log(`Đăng ký thành công cho email ${data.email}`);
    return response;
  }

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

  @Post('logout')
  async logout(
    @Body() logoutDto: LogoutDto,
    @Req() req: AuthRequest,
  ): Promise<IMessage> {
    await req.logOut((err) => {
      console.log(err);
    });
    const response = await this.authService.logout(logoutDto.refreshToken);
    this.logger.log(`Người dùng ${req.user?.email} đăng xuất thành công`);
    return response;
  }

  // Xác nhận email bằng token xác nhận
  // Highlights: Xác minh token và cập nhật trạng thái isEmailVerified
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
      `Xác nhận email thành công cho token: ${token.substring(0, 10)}...`,
    );
    return response;
  }

  @Public()
  @Post('refresh-token')
  async refreshToken(
    @Body('refreshToken') refreshToken: string,
  ): Promise<ApiResponse<IAuthResult>> {
    if (!refreshToken) {
      throw new BadRequestException(
        this.authService.generateMessage('Refresh token không được cung cấp'),
      );
    }

    const result = await this.authService.refreshTokenAccess({
      refreshToken: refreshToken,
    });
    this.logger.log(
      `Làm mới token thành công cho người dùng ${result.user.email}`,
    );
    return {
      code: HttpStatus.OK,
      message: 'Làm mới token thành công',
      data: result,
    };
  }

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

  @Post('change-password')
  async changePassword(
    @Body() data: ChangePasswordDto,
    @Req() req: AuthRequest,
  ): Promise<ApiResponse<IAuthResult>> {
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

    const result = await this.authService.changePassword(
      req.user._id.toString(),
      data,
    );
    this.logger.log(
      `Thay đổi mật khẩu thành công cho người dùng ${req.user.email}`,
    );
    return {
      code: HttpStatus.OK,
      message: 'Thay đổi mật khẩu thành công',
      data: result,
    };
  }
}
