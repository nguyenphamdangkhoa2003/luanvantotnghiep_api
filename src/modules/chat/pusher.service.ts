import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Pusher from 'pusher';

@Injectable()
export class PusherService {
  private pusher: Pusher;

  constructor(private configService: ConfigService) {
    this.pusher = new Pusher({
      appId: this.configService.getOrThrow<string>('pusher.app_id'),
      key: this.configService.getOrThrow<string>('pusher.key'),
      secret: this.configService.getOrThrow<string>('pusher.secret'),
      cluster: this.configService.getOrThrow<string>('pusher.cluster'),
      useTLS: true,
    });

    console.log('Pusher Config:', {
      appId: this.configService.getOrThrow<string>('pusher.app_id'),
      key: this.configService.getOrThrow<string>('pusher.key'),
      secret: this.configService.getOrThrow<string>('pusher.secret'),
      cluster: this.configService.getOrThrow<string>('pusher.cluster'),
    });
  }

  async trigger(channel: string, event: string, data: any): Promise<void> {
    await this.pusher.trigger(channel, event, data);
  }

  async authenticate(
    socketId: string,
    channelName: string,
    userData?: any,
  ): Promise<any> {
    if (channelName.startsWith('private-')) {
      // Xác thực private channel
      return this.pusher.authenticate(socketId, channelName);
    } else if (channelName.startsWith('presence-')) {
      // Xác thực presence channel
      if (!userData || !userData.user_id) {
        throw new Error(
          'Invalid user data: user_id is required for presence channels',
        );
      }
      return this.pusher.authenticateUser(socketId, userData);
    } else {
      throw new Error('Unsupported channel type');
    }
  }
}
