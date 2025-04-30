import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { SignInDto } from 'src/modules/auth/Dto/signin.dto';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super();
  }
  async validate(username: string, password: string): Promise<any> {
    const validateUserData: SignInDto = {
      username,
      password,
    };
    const data = await this.authService.validateUser(validateUserData);
    if (!data) {
      throw new UnauthorizedException();
    }
    return data;
  }
}
