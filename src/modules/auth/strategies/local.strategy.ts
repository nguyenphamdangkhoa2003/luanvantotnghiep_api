import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { AuthService } from '../auth.service';
import { SignInDto } from '@/modules/auth/DTOs/sign-in.dto';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(LocalStrategy.name);

  constructor(private authService: AuthService) {
    super({
      usernameField: 'emailOrUsername',
      passwordField: 'password',
    });
  }

  async validate(emailOrUsername: string, password: string): Promise<any> {
    this.logger.log(`Validating user: ${emailOrUsername}`);

    // Tạo đối tượng SignInDto
    const validateUserData = new SignInDto();
    validateUserData.emailOrUsername = emailOrUsername;
    validateUserData.password = password;

    // Xác thực dữ liệu đầu vào
    const errors = await validate(validateUserData);
    if (errors.length > 0) {
      const errorMessages = errors
        .map((error) => {
          if (error.constraints) {
            return Object.values(error.constraints);
          }
          return ['Lỗi xác thực không xác định'];
        })
        .flat()
        .join(', ');
      this.logger.warn(`Validation errors: ${errorMessages}`);
      throw new BadRequestException(`Dữ liệu không hợp lệ: ${errorMessages}`);
    }

    // Gọi AuthService để xác thực người dùng
    const data = await this.authService.validateUser(validateUserData);
    if (!data) {
      this.logger.warn(`Authentication failed for ${emailOrUsername}`);
      throw new UnauthorizedException('Xác thực không thành công!');
    }

    this.logger.log(`User ${emailOrUsername} validated successfully`);
    return data;
  }
}
