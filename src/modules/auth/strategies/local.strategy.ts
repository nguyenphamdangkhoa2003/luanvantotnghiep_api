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

  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'emailOrUsername', // Tên trường người dùng gửi lên
      passwordField: 'password', // Tên trường mật khẩu
    });
  }

  /**
   * Hàm validate được gọi tự động bởi Passport sau khi nhận thông tin đăng nhập.
   * Dùng để kiểm tra dữ liệu đầu vào và xác thực người dùng.
   *
   * @param emailOrUsername - Email hoặc tên đăng nhập do người dùng cung cấp
   * @param password - Mật khẩu do người dùng cung cấp
   * @returns Thông tin người dùng nếu xác thực thành công
   * @throws BadRequestException nếu dữ liệu không hợp lệ
   * @throws UnauthorizedException nếu xác thực thất bại
   */
  async validate(emailOrUsername: string, password: string): Promise<any> {
    this.logger.log(`🔐 Đang xác thực người dùng: ${emailOrUsername}`);

    // Bước 1: Tạo DTO từ dữ liệu đăng nhập
    const credentials = new SignInDto();
    credentials.emailOrUsername = emailOrUsername;
    credentials.password = password;

    // Bước 2: Validate dữ liệu đầu vào theo DTO
    const errors = await validate(credentials);
    if (errors.length > 0) {
      const errorMessages = errors
        .flatMap((error) =>
          error.constraints
            ? Object.values(error.constraints)
            : ['Lỗi không xác định'],
        )
        .join(', ');

      this.logger.warn(`⚠️ Lỗi validate: ${errorMessages}`);
      throw new BadRequestException(`Dữ liệu không hợp lệ: ${errorMessages}`);
    }

    // Bước 3: Gọi AuthService để xác thực người dùng
    const user = await this.authService.validateUser(credentials);
    if (!user) {
      this.logger.warn(`🚫 Xác thực thất bại: ${emailOrUsername}`);
      throw new UnauthorizedException(
        'Email/Tài khoản hoặc mật khẩu không đúng.',
      );
    }

    this.logger.log(`✅ Xác thực thành công: ${emailOrUsername}`);
    return user;
  }
}
