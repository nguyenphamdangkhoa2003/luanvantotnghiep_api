import { NestFactory } from '@nestjs/core';
import { AppModule } from './core/app.module';
import { ConsoleLogger, Logger, ValidationPipe } from '@nestjs/common';

const APP_NAME = 'XeShare API';
const logger = new Logger(APP_NAME, { timestamp: true });

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule, {
      logger: new ConsoleLogger({
        prefix: 'XeShare API',
        logLevels: ['log'],
      }),
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    logger.log(`🚀 Server running on port ${port}`);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : 'N/A';
    logger.error(
      `🚨 Failed to start the application: ${errorMessage}`,
      errorStack,
    );
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const errorStack = error instanceof Error ? error.stack : 'N/A';
  logger.error(
    `🚨 Unexpected error during bootstrap: ${errorMessage}`,
    errorStack,
  );
  process.exit(1);
});
