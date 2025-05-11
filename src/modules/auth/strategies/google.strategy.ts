import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { SignInByGoogleDto } from '../DTOs/sign-in-by-google.dto';
import { AuthService } from '@/modules/auth/auth.service';

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

  async validate(accessToken: string, refreshToken: string, profile: any) {
    const signInByGoogleDto: SignInByGoogleDto = {
      avatar: profile.photos?.[0]?.value,
      email: profile.emails?.[0]?.value,
      name: profile.displayName,
    };
    const data = await this.authService.validateEmailUser(signInByGoogleDto);

    return data;
  }
}
