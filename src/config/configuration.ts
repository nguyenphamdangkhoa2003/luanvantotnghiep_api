import { ConfigModuleOptions } from '@nestjs/config';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';
import { validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { IAppConfig } from '@/config/interface/app.interface';
import { readFileSync } from 'fs';
import { join } from 'path';

class ConfigSchema {
  @IsString()
  @IsNotEmpty()
  MONGO_URI: string;

  @IsString()
  @IsNotEmpty()
  APP_NAME: string;

  @IsNumber()
  @IsNotEmpty()
  JWT_ACCESS_TIME: number;

  @IsString()
  @IsNotEmpty()
  JWT_CONFIRMATION_SECRET: string;

  @IsNumber()
  @IsNotEmpty()
  JWT_CONFIRMATION_TIME: number;

  @IsString()
  @IsNotEmpty()
  JWT_RESET_PASSWORD_SECRET: string;

  @IsNumber()
  @IsNotEmpty()
  JWT_RESET_PASSWORD_TIME: number;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET: string;

  @IsNumber()
  @IsNotEmpty()
  JWT_REFRESH_TIME: number;

  @IsInt()
  @Min(0)
  PORT: number = 3000;

  @IsString()
  @IsNotEmpty()
  SESSION_SECRET: string;

  @IsString()
  @IsNotEmpty()
  GOOGLE_CLIENT_ID: string;

  @IsString()
  @IsNotEmpty()
  GOOGLE_SECRET: string;

  @IsString()
  @IsNotEmpty()
  GOOGLE_CALLBACK_URL: string;

  @IsString()
  @IsNotEmpty()
  EMAIL_HOST: string;

  @IsNumber()
  @IsNotEmpty()
  EMAIL_PORT: number;

  @IsBoolean()
  EMAIL_SECURE: boolean;

  @IsString()
  @IsNotEmpty()
  EMAIL_USER: string;

  @IsString()
  @IsNotEmpty()
  EMAIL_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  APP_ID: string;

  @IsString()
  @IsNotEmpty()
  DOMAIN: string;

  @IsString()
  @IsNotEmpty()
  CLOUDINARY_CLOUD_NAME: string;

  @IsString()
  @IsNotEmpty()
  CLOUDINARY_API_KEY: string;

  @IsString()
  @IsNotEmpty()
  CLOUDINARY_API_SECRET: string;

  @IsString()
  @IsNotEmpty()
  VNPAY_TMN_CODE: string;

  @IsString()
  @IsNotEmpty()
  VNPAY_HASH_SECRET: string;

  @IsString()
  @IsNotEmpty()
  VNPAY_PAYMENT_GATEWAY: string;

  @IsString()
  @IsNotEmpty()
  VNPAY_RETURN_URL: string;

  @IsString()
  @IsNotEmpty()
  MAPBOX_ACCESS_TOKEN: string;

  @IsString()
  @IsNotEmpty()
  PUSHER_APP_ID: string;

  @IsString()
  @IsNotEmpty()
  PUSHER_KEY: string;

  @IsString()
  @IsNotEmpty()
  PUSHER_SECRET: string;

  @IsString()
  @IsNotEmpty()
  PUSHER_CLUSTER: string;
}

export const configModuleOptions: ConfigModuleOptions = {
  isGlobal: true,
  validate: (env: Record<string, any>) => {
    const config = plainToInstance(ConfigSchema, {
      ...env,
      EMAIL_PORT: env.EMAIL_PORT ? parseInt(env.EMAIL_PORT as string, 10) : 587,
      EMAIL_SECURE:
        env.EMAIL_SECURE === 'true' ||
        env.EMAIL_SECURE === true ||
        env.EMAIL_SECURE === 'false' ||
        env.EMAIL_SECURE === false
          ? env.EMAIL_SECURE === 'true' || env.EMAIL_SECURE === true
          : false,
      PORT: env.PORT ? parseInt(env.PORT as string, 10) : 3000,
      JWT_ACCESS_TIME: env.JWT_ACCESS_TIME
        ? parseInt(env.JWT_ACCESS_TIME as string, 10)
        : 600,
      JWT_CONFIRMATION_TIME: env.JWT_CONFIRMATION_TIME
        ? parseInt(env.JWT_CONFIRMATION_TIME as string, 10)
        : 3600,
      JWT_RESET_PASSWORD_TIME: env.JWT_RESET_PASSWORD_TIME
        ? parseInt(env.JWT_RESET_PASSWORD_TIME as string, 10)
        : 1800,
      JWT_REFRESH_TIME: env.JWT_REFRESH_TIME
        ? parseInt(env.JWT_REFRESH_TIME as string, 10)
        : 604800,
    });

    const errors = validateSync(config, {
      forbidUnknownValues: true,
      stopAtFirstError: true,
      skipMissingProperties: false,
    });

    if (errors.length > 0) {
      throw new Error(`Xác thực cấu hình thất bại: ${errors.toString()}`);
    }

    return config;
  },
};

export default (): IAppConfig => {
  const publicKey = readFileSync(
    join(__dirname, '..', '..', 'src/keys/public.key'),
    'utf-8',
  );
  const privateKey = readFileSync(
    join(__dirname, '..', '..', 'src/keys/private.key'),
    'utf-8',
  );

  const env = plainToInstance(ConfigSchema, {
    APP_ID: process.env.APP_ID,
    DOMAIN: process.env.DOMAIN,
    PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
    APP_NAME: process.env.APP_NAME,
    MONGO_URI: process.env.MONGO_URI,
    JWT_ACCESS_TIME: process.env.JWT_ACCESS_TIME
      ? parseInt(process.env.JWT_ACCESS_TIME, 10)
      : 600,
    JWT_CONFIRMATION_SECRET: process.env.JWT_CONFIRMATION_SECRET,
    JWT_CONFIRMATION_TIME: process.env.JWT_CONFIRMATION_TIME
      ? parseInt(process.env.JWT_CONFIRMATION_TIME, 10)
      : 3600,
    JWT_RESET_PASSWORD_SECRET: process.env.JWT_RESET_PASSWORD_SECRET,
    JWT_RESET_PASSWORD_TIME: process.env.JWT_RESET_PASSWORD_TIME
      ? parseInt(process.env.JWT_RESET_PASSWORD_TIME, 10)
      : 1800,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    JWT_REFRESH_TIME: process.env.JWT_REFRESH_TIME
      ? parseInt(process.env.JWT_REFRESH_TIME, 10)
      : 604800,
    SESSION_SECRET: process.env.SESSION_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_SECRET: process.env.GOOGLE_SECRET,
    GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,
    EMAIL_HOST: process.env.EMAIL_HOST,
    EMAIL_PORT: process.env.EMAIL_PORT
      ? parseInt(process.env.EMAIL_PORT, 10)
      : 587,
    EMAIL_SECURE: process.env.EMAIL_SECURE === 'true',
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
    VNPAY_TMN_CODE: process.env.VNPAY_TMN_CODE,
    VNPAY_HASH_SECRET: process.env.VNPAY_HASH_SECRET,
    VNPAY_PAYMENT_GATEWAY: process.env.VNPAY_PAYMENT_GATEWAY,
    VNPAY_RETURN_URL: process.env.VNPAY_RETURN_URL,
    MAPBOX_ACCESS_TOKEN: process.env.MAPBOX_ACCESS_TOKEN,
    PUSHER_APP_ID: process.env.PUSHER_APP_ID,
    PUSHER_KEY: process.env.PUSHER_KEY,
    PUSHER_SECRET: process.env.PUSHER_SECRET,
    PUSHER_CLUSTER: process.env.PUSHER_CLUSTER,
  });

  return {
    id: env.APP_ID,
    domain: env.DOMAIN,
    emailService: {
      auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_PASSWORD,
      },
      host: env.EMAIL_HOST,
      port: env.EMAIL_PORT,
      secure: env.EMAIL_SECURE,
    },
    session: {
      secret: env.SESSION_SECRET,
    },
    jwt: {
      access: {
        publicKey,
        privateKey,
        time: env.JWT_ACCESS_TIME,
      },
      confirmation: {
        secret: env.JWT_CONFIRMATION_SECRET,
        time: env.JWT_CONFIRMATION_TIME,
      },
      resetPassword: {
        secret: env.JWT_RESET_PASSWORD_SECRET,
        time: env.JWT_RESET_PASSWORD_TIME,
      },
      refresh: {
        secret: env.JWT_REFRESH_SECRET,
        time: env.JWT_REFRESH_TIME,
      },
    },
    app: {
      name: env.APP_NAME,
    },
    port: env.PORT,
    database: {
      url: env.MONGO_URI,
    },
    googleOAuth: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_SECRET,
      callbackUrl: env.GOOGLE_CALLBACK_URL,
    },
    cloudinary: {
      api_key: env.CLOUDINARY_API_KEY,
      name: env.CLOUDINARY_CLOUD_NAME,
      api_secret: env.CLOUDINARY_API_SECRET,
    },
    vnpay: {
      hash_secret: env.VNPAY_HASH_SECRET,
      tmn_code: env.VNPAY_TMN_CODE,
      payment_gateway: env.VNPAY_PAYMENT_GATEWAY,
      return_url: env.VNPAY_RETURN_URL,
    },
    mapbox_access_token: env.MAPBOX_ACCESS_TOKEN,
    pusher: {
      app_id: env.PUSHER_APP_ID,
      cluster: env.PUSHER_CLUSTER,
      key: env.PUSHER_KEY,
      secret: env.PUSHER_SECRET,
      useTLS: true,
    },
  };
};
