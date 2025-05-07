import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ThrottlerModuleOptions,
  ThrottlerOptionsFactory,
} from '@nestjs/throttler';

@Injectable()
export class ThrottlerConfig implements ThrottlerOptionsFactory {
  constructor(private readonly configService: ConfigService) {}

  createThrottlerOptions(): ThrottlerModuleOptions {
    return {
      throttlers: [
        {
          ttl: this.configService.get<number>('THROTTLER_TTL', 60),
          limit: this.configService.get<number>('THROTTLER_LIMIT', 100),
        },
      ],
    };
  }
}
