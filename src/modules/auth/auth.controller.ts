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
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from '@/modules/auth/auth.service';
import { LocalAuthGuard } from '@/modules/auth/guard/local-strategy.guard';
import { ApiResponse, AuthRequest, IMessage } from '@/types';
import { Public } from '@/modules/auth/decorators/public.decorators';
import { SignUpDto } from '@/modules/auth/DTOs/sign-up.dto';
import { IAuthResult } from '@/modules/auth/interfaces/types';
import { EmailDto } from '@/modules/auth/DTOs/email.dto';
import { ResetPasswordDto } from '@/modules/auth/DTOs/reset-password.dto';
import { ChangePasswordDto } from '@/modules/auth/DTOs/change-password.dto';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthService } from '@/modules/jwt-auth/jwt-auth.service';
import { getCookies, setCookies } from '@/common/utils/cookie.utils';
import { ConfigService } from '@nestjs/config';
import { TokenTypeEnum } from '@/modules/jwt-auth/enums/types';
import { RolesGuard } from '@/modules/auth/guard/role.guard';
import { UserRole } from '@/modules/users/schemas/user.schema';
import { Roles } from '@/modules/auth/decorators/roles.decorator';

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
    setCookies(res, [
      {
        name: TokenTypeEnum.ACCESS,
        value: accessToken,
        options: {
          maxAge:
            Number(this.configService.get<string>('jwt.access.time')) * 1000,
          httpOnly: false,
        },
      },
      {
        name: TokenTypeEnum.REFRESH,
        value: refreshToken,
        options: {
          maxAge:
            Number(this.configService.get<string>('jwt.refresh.time')) * 1000,
        },
      },
    ]);
    this.logger.log(`Người dùng ${req.user.email} đăng nhập thành công`);
    return res.status(HttpStatus.OK).json({
      code: HttpStatus.OK,
      message: 'Đăng nhập thành công',
      data: { user: req.user },
    });
  }

  @Public()
  @UseGuards(AuthGuard('google'))
  @Get('google')
  async googleLogin() {}

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req, @Res() res: Response) {
    const user = req.user;
    const [accessToken, refreshToken] =
      await this.authService.loginByGoogle(user);
    setCookies(res, [
      {
        name: TokenTypeEnum.ACCESS,
        value: accessToken,
        options: {
          maxAge:
            Number(this.configService.get<string>('jwt.access.time')) * 1000,
          httpOnly: false,
        }, // 1 giờ
      },
      {
        name: TokenTypeEnum.REFRESH,
        value: refreshToken,
        options: {
          maxAge:
            Number(this.configService.get<string>('jwt.refresh.time')) * 1000,
        }, // 7 ngày
      },
    ]);
    return res.redirect('http://localhost:3001/?login=success');
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
  async logout(@Req() req: AuthRequest): Promise<IMessage> {
    await req.logOut((err) => {
      console.log(err);
    });
    const refreshToken = getCookies(req, TokenTypeEnum.REFRESH);
    if (typeof refreshToken !== 'string') {
      throw new BadRequestException('Refresh token không hợp lệ');
    }
    const response = await this.authService.logout(refreshToken);

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
  async refreshToken(@Res() res: Response, @Req() req: Request) {
    const refreshToken = getCookies(req, TokenTypeEnum.REFRESH);
    if (typeof refreshToken !== 'string')
      throw new InternalServerErrorException();
    const [accessToken, newRefreshToken] =
      await this.authService.refreshTokenAccess({
        refreshToken: refreshToken,
      });

    setCookies(res, [
      {
        name: TokenTypeEnum.ACCESS,
        value: accessToken,
        options: {
          maxAge:
            Number(this.configService.get<string>('jwt.access.time')) * 1000,
          httpOnly: false,
        },
      },
      {
        name: TokenTypeEnum.REFRESH,
        value: newRefreshToken,
        options: {
          maxAge:
            Number(this.configService.get<string>('jwt.refresh.time')) * 1000,
        },
      },
    ]);

    this.logger.log(`Làm mới token thành công cho người dùng`);
    return res.status(HttpStatus.OK).json({
      message: 'Làm mới token thành công',
    });
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
    setCookies(res, [
      {
        name: TokenTypeEnum.ACCESS,
        value: accessToken,
        options: {
          maxAge:
            Number(this.configService.get<string>('jwt.access.time')) * 1000,
          httpOnly: false,
        }, // 1 giờ
      },
      {
        name: TokenTypeEnum.REFRESH,
        value: refreshToken,
        options: {
          maxAge:
            Number(this.configService.get<string>('jwt.refresh.time')) * 1000,
        }, // 7 ngày
      },
    ]);
    this.logger.log(
      `Thay đổi mật khẩu thành công cho người dùng ${req.user.email}`,
    );
    return res.status(HttpStatus.OK).json({
      code: HttpStatus.OK,
      message: 'Thay đổi mật khẩu thành công',
    });
  }
}
