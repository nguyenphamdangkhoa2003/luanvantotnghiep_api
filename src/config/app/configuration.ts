import { z } from 'zod';
import { ConfigModuleOptions } from '@nestjs/config';
import { AppConfig } from 'src/config/app/interface/types';

const configSchema = z.object({
  PORT: z
    .string()
    .default('3000')
    .transform((val) => parseInt(val, 10)),
  MONGO_URI: z.string().nonempty('Không tìm thấy chuỗi kết nối'),
});

export const configModuleOptions: ConfigModuleOptions = {
  isGlobal: true,
  validate: (env: Record<string, any>) => {
    const parsed = configSchema.safeParse(env);
    if (!parsed.success) {
      throw new Error(
        `Xác thực cấu hình thất bại: ${JSON.stringify(parsed.error.format(), null, 2)}`,
      );
    }
    return parsed.data;
  },
  envFilePath: ['.env'],
};

export default (): AppConfig => {
  const env = {
    PORT: process.env.PORT,
    MONGO_URI: process.env.MONGO_URI,
  };

  // Validate biến môi trường
  const parsedConfig = configSchema.parse(env);

  return {
    port: parsedConfig.PORT,
    database: {
      url: parsedConfig.MONGO_URI,
    },
  };
};
