import { IEmailConfig } from '@/config/interface/email-config.interface';
import { IGoogleOauth2Config } from '@/config/interface/google-oauth2-config.interface';
import { IJwtConfig } from '@/config/interface/jwt-config.interface';
import { RedisOptions } from 'ioredis';

export interface IAppConfig {
  id: string;
  domain: string;
  jwt: IJwtConfig;
  session: {
    secret: string;
  };
  app: {
    name: string;
  };
  port: number;
  database: {
    url: string;
  };
  googleOAuth: IGoogleOauth2Config;
  emailService: IEmailConfig;
  redis: RedisOptions;
}
