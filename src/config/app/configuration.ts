import { ConfigModuleOptions } from '@nestjs/config';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { AppConfig } from 'src/config/app/interface/types';
import { validateSync } from 'class-validator';
import { plainToClass } from 'class-transformer';

class ConfigSchema {
  @IsString()
  @IsNotEmpty({ message: 'Không tìm thấy chuỗi kết nối' })
  MONGO_URI: string;

  @IsString()
  @IsNotEmpty({ message: 'Không tìm thấy app name' })
  APP_NAME: string;

  @IsString()
  @IsNotEmpty({ message: 'Không tìm thấy jwt secret' })
  JWT_SECRET: string;

  @IsInt()
  @Min(0)
  PORT: number = 3000;
}

export const configModuleOptions: ConfigModuleOptions = {
  isGlobal: true,
  validate: (env: Record<string, any>) => {
    const config = plainToClass(ConfigSchema, {
      ...env,
      PORT: env.PORT ? parseInt(env.PORT as string, 10) : 3000,
    });

    const errors = validateSync(config, { forbidUnknownValues: true });

    if (errors.length > 0) {
      throw new Error(
        `Xác thực cấu hình thất bại: ${JSON.stringify(errors, null, 2)}`,
      );
    }

    return config;
  },
  envFilePath: ['.env'],
};

export default (): AppConfig => {
  const env = plainToClass(ConfigSchema, {
    PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
    MONGO_URI: process.env.MONGO_URI,
    APP_NAME: process.env.APP_NAME,
    JWT_SECRET: process.env.JWT_SECRET,
  });

  const errors = validateSync(env, { forbidUnknownValues: true });

  if (errors.length > 0) {
    throw new Error(
      `Xác thực cấu hình thất bại: ${JSON.stringify(errors, null, 2)}`,
    );
  }

  return {
    jwt: {
      secret: env.JWT_SECRET,
    },
    app: {
      name: env.APP_NAME,
    },
    port: env.PORT,
    database: {
      url: env.MONGO_URI,
    },
  };
};
