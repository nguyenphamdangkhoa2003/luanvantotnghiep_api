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
  @IsNotEmpty({ message: 'Không tìm thấy mongo uri' })
  MONGO_URI: string;

  @IsString()
  @IsNotEmpty({ message: 'Không tìm thấy app name' })
  APP_NAME: string;

  @IsNumber()
  @IsNotEmpty({ message: 'Không tìm thấy jwt access time' })
  JWT_ACCESS_TIME: number;

  @IsString()
  @IsNotEmpty({ message: 'Không tìm thấy jwt confirmation secret' })
  JWT_CONFIRMATION_SECRET: string;

  @IsNumber()
  @IsNotEmpty({ message: 'Không tìm thấy jwt confirmation time' })
  JWT_CONFIRMATION_TIME: number;

  @IsString()
  @IsNotEmpty({ message: 'Không tìm thấy jwt reset password secret' })
  JWT_RESET_PASSWORD_SECRET: string;

  @IsNumber()
  @IsNotEmpty({ message: 'Không tìm thấy jwt reset password time' })
  JWT_RESET_PASSWORD_TIME: number;

  @IsString()
  @IsNotEmpty({ message: 'Không tìm thấy jwt refresh secret' })
  JWT_REFRESH_SECRET: string;

  @IsNumber()
  @IsNotEmpty({ message: 'Không tìm thấy jwt refresh time' })
  JWT_REFRESH_TIME: number;

  @IsInt()
  @Min(0)
  PORT: number = 3000;

  @IsString()
  @IsNotEmpty({ message: 'Không tìm thấy session secret' })
  SESSION_SECRET: string;

  @IsString()
  @IsNotEmpty({ message: 'Không tìm thấy google client id' })
  GOOGLE_CLIENT_ID: string;

  @IsString()
  @IsNotEmpty({ message: 'Không tìm thấy google secret' })
  GOOGLE_SECRET: string;

  @IsString()
  @IsNotEmpty({ message: 'Không tìm thấy google callback url' })
  GOOGLE_CALLBACK_URL: string;

  @IsString()
  @IsNotEmpty({ message: 'Không tìm thấy email host' })
  EMAIL_HOST: string;

  @IsNumber()
  @IsNotEmpty({ message: 'Không tìm thấy email port' })
  EMAIL_PORT: number;

  @IsBoolean()
  EMAIL_SECURE: boolean;

  @IsString()
  @IsNotEmpty({ message: 'Không tìm thấy email user' })
  EMAIL_USER: string;

  @IsString()
  @IsNotEmpty({ message: 'Không tìm thấy email password' })
  EMAIL_PASSWORD: string;

  @IsString()
  @IsNotEmpty({ message: 'Không tìm thấy app id' })
  APP_ID: string;

  @IsString()
  @IsNotEmpty({ message: 'Không tìm thấy domain' })
  DOMAIN: string;
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
  };
};
