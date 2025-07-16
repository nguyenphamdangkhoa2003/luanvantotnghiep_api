import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { SignInByGoogleDto } from '../DTOs/sign-in-by-google.dto';
import { AuthService } from '@/modules/auth/auth.service';

/**
 * GoogleStrategy dùng để xử lý xác thực OAuth2 qua Google.
 * Được kích hoạt bởi Passport khi route sử dụng 'google' strategy.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('googleOAuth.clientId'),
      clientSecret: configService.get<string>('googleOAuth.clientSecret'),
      callbackURL: configService.get<string>('googleOAuth.callbackUrl'),
      scope: ['profile', 'email'],
    });
  }

  /**
   * Hàm validate được Passport gọi sau khi người dùng xác thực thành công với Google.
   * Dùng để chuyển đổi dữ liệu từ Google profile sang định dạng nội bộ của hệ thống.
   *
   * @param accessToken - Access token từ Google (có thể dùng gọi API phụ)
   * @param refreshToken - Token làm mới (ít dùng)
   * @param profile - Thông tin người dùng từ Google
   * @returns Thông tin người dùng đã xác thực, hoặc tạo mới nếu chưa có trong hệ thống
   */
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
  ): Promise<any> {
    const signInByGoogleDto: SignInByGoogleDto = {
      avatar: profile.photos?.[0]?.value || null,
      email: profile.emails?.[0]?.value || null,
      name: profile.displayName || 'No name',
    };

    // Gọi AuthService để xác thực hoặc tạo mới tài khoản người dùng Google
    const user = await this.authService.validateEmailUser(signInByGoogleDto);

    return user;
  }
}
