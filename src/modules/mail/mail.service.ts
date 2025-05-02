import { User } from '@/modules/users/schemas/user.schema';
import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger: Logger;
  constructor(private mailerService: MailerService) {
    this.logger = new Logger();
  }

  async sendUserConfirmation(user: User, token: string) {
    const url = `example.com/auth/confirm?token=${token}`;

    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Welcome to Nice App! Confirm your Email',
      template: './confirmation',
      context: {
        name: user.name,
        url,
      },
    });

    this.logger.log(`mail sent successfully 🎉📨`);
  }
}
