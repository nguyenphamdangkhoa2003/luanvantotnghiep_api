import { ICloundinaryConfig } from '@/config/interface/cloudinary-config.interface';
import { IEmailConfig } from '@/config/interface/email-config.interface';
import { IGoogleOauth2Config } from '@/config/interface/google-oauth2-config.interface';
import { IJwtConfig } from '@/config/interface/jwt-config.interface';
import { IPusherConfig } from '@/config/interface/pusher-config.inteface';
import { IVnpayConfig } from '@/config/interface/vnpay-config.interface';

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
  cloudinary: ICloundinaryConfig;
  vnpay: IVnpayConfig;
  mapbox_access_token: string;
  pusher: IPusherConfig;
}
