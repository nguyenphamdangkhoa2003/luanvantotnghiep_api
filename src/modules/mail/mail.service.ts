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

  public async sendMail(
    to: string,
    subject: string,
    template: string,
    context: Record<string, any>,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to,
        subject,
        template: `./${template}`,
        context: {
          app: 'XeShare',
          year: new Date().getFullYear(),
          myMail: this.email,
          ...context,
        },
      });

      this.logger.log(`Mail sent successfully to ${to} 🎉📨`);
    } catch (error) {
      this.logger.error(
        `Failed to send mail to ${to}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  public async sendConfirmationEmail(user: User, token: string): Promise<void> {
    const { email, name } = user;
    const link = `http://${this.domain}/auth/confirm-email/${token}`;

    await this.sendMail(
      email,
      'Welcome to XeShare! Confirm your Email',
      'confirmation',
      {
        name,
        email,
        link,
      },
    );
  }

  public async sendResetPasswordEmail(
    user: User,
    token: string,
  ): Promise<void> {
    const { email, name } = user;
    const link = `http://${this.domain}/auth/reset-password?code=${token}`;

    await this.sendMail(email, 'Reset your password', 'reset_password', {
      name,
      email,
      myMail: this.email,
      link,
    });
  }
}
