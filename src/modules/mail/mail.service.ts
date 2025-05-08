import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { User } from '@/modules/users/schemas/user.schema';
import { ConfigService } from '@nestjs/config';
import { IEmailConfig } from '@/config/interface/email-config.interface';

@Injectable()
export class MailService {
  private readonly logger: Logger;
  private readonly email: string;
  private readonly domain: string;
  constructor(
    private mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {
    this.logger = new Logger(MailService.name);
    const emailConfig = this.configService.get<IEmailConfig>('emailService')!;
    this.email = `XeShare <${emailConfig.auth.user}>`;
    this.domain = this.configService.get<string>('domain')!;
  }

  public async sendConfirmationEmail(user: User, token: string): Promise<void> {
    const { email, name } = user;
    const link = `http://${this.domain}/auth/confirm-email/${token}`;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Welcome to XeShare! Confirm your Email',
        template: './confirmation',
        context: {
          app: 'XeShare',
          name,
          email,
          link,
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

  public async sendResetPasswordEmail(user: User, token: string) {
    const { email, name } = user;
    const link = `http://${this.domain}/auth/reset-password?code=${token}`;
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Reset your password',
        template: './reset_password',
        context: {
          app: 'XeShare',
          name,
          email,
          myMail: this.email,
          link,
          year: new Date().getFullYear(),
        },
      });

      this.logger.log(`Mail sent successfully to ${user.email} 🎉📨`);
    } catch (error) {
      this.logger.error(
        `Failed to send mail to ${user.email}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to send reset password email: ${error.message}`);
    }
  }
}
