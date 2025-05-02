import { ConfigModuleOptions } from '@nestjs/config';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';
import { IAppConfig } from '@/config/app/interface/app.interface';
import { validateSync } from 'class-validator';
import { plainToClass, plainToInstance } from 'class-transformer';

class ConfigSchema {
  @IsString()
  @IsNotEmpty({ message: 'Không tìm thấy monogo uri' })
  MONGO_URI: string;

  @IsString()
  @IsNotEmpty({ message: 'Không tìm thấy app name' })
  APP_NAME: string;

  @IsString()
  @IsNotEmpty({ message: 'Không tìm thấy jwt secret' })
  JWT_SECRET: string;

  @IsString()
  @IsNotEmpty({ message: 'Không tìm thấy jwt expire' })
  JWT_EXPIRE_IN: string;

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
  @IsNotEmpty({ message: 'Không tìm thấy google email host' })
  EMAIL_HOST: string;

  @IsNumber()
  @IsNotEmpty({ message: 'Không tìm thấy google email host' })
  EMAIL_PORT: number;

  @IsBoolean()
  EMAIL_SECURE: boolean;

  @IsString()
  @IsNotEmpty({ message: 'Không tìm thấy google user' })
  EMAIL_USER: string;

  @IsString()
  @IsNotEmpty({ message: 'Không tìm thấy google password' })
  EMAIL_PASSWORD: string;
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
  const env = plainToClass(ConfigSchema, {
    PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
    APP_NAME: process.env.APP_NAME,

    MONGO_URI: process.env.MONGO_URI,

    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRE_IN: process.env.JWT_EXPIRE_IN,

    SESSION_SECRET: process.env.SESSION_SECRET,

    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_SECRET: process.env.GOOGLE_SECRET,
    GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,

    EMAIL_HOST: process.env.EMAIL_HOST,
    EMAIL_PORT: process.env.EMAIL_PORT
      ? parseInt(process.env.EMAIL_PORT, 10)
      : 587,
    EMAIL_SECURE: process.env.EMAIL_SECURE || false,
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
  });

  return {
    emailSerivce: {
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
      secret: env.JWT_SECRET,
      expire_in: env.JWT_EXPIRE_IN,
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
