import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { LoginUserDto } from '@/modules/auth/dto/login-user.dto';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email',
    });
  }
  async validate(email: string, password: string): Promise<any> {
    const validateUserData: LoginUserDto = {
      email,
      password,
    };
    const data = await this.authService.validateUser(validateUserData);
    if (!data) {
      throw new UnauthorizedException('Xác thực user không thành công');
    }
    return data;
  }
}
