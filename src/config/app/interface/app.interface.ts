import { IEmailConfig } from '@/config/app/interface/email-config.interface';
import { IGoogleOauth2 } from '@/config/app/interface/google-oauth2.interface';

export interface IAppConfig {
  jwt: {
    secret: string;
    expire_in: string;
  };
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
  googleOAuth: IGoogleOauth2;
  emailSerivce: IEmailConfig;
}
