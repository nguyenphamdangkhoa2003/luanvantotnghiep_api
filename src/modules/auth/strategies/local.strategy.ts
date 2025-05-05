import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { SignInDto } from '@/modules/auth/dto/sign-in.dto';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'emailOrUsername',
    });
  }
  async validate(emailOrUsername: string, password: string): Promise<any> {
    const validateUserData: SignInDto = {
      emailOrUsername,
      password,
    };
    const data = await this.authService.validateUser(validateUserData);
    if (!data) {
      throw new UnauthorizedException();
    }
    return data;
  }
}
