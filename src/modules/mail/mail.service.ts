import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { User } from '@/modules/users/schemas/user.schema';

@Injectable()
export class MailService {
  private readonly logger: Logger;

  constructor(private mailerService: MailerService) {
    this.logger = new Logger(MailService.name);
  }

  async sendUserConfirmation(user: User, token: string) {
    // Dữ liệu giả để test

    const mockToken = token || 'mock-token-123456789';
    const verificationLink = `http://example.com/auth/confirm?token=${mockToken}`;
    const unsubscribeLink = `http://example.com/unsubscribe?email=${user.email}`;
    const preferencesLink = `http://example.com/preferences?email=${user.email}`;
    const code = '6289'; // Mã xác thực giả, thay bằng logic tạo mã ngẫu nhiên nếu cần

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: 'Welcome to Nice App! Confirm your Email',
        template: './confirmation', // File confirmation.hbs
        context: {
          name: user.name,
          code: code.split(''), // Chuyển mã thành mảng: ['6', '2', '8', '9']
          verificationLink,
          email: user.email,
          unsubscribeLink,
          preferencesLink,
          year: new Date().getFullYear(),
        },
      });

      this.logger.log(`Mail sent successfully to ${user.email} 🎉📨`);
    } catch (error) {
      this.logger.error(
        `Failed to send mail to ${user.email}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to send confirmation email: ${error.message}`);
    }
  }
}
