import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './core/app.module';
import { ConsoleLogger, Logger, ValidationPipe } from '@nestjs/common';
import * as session from 'express-session';
import { ConfigService } from '@nestjs/config';
import { CipherKey } from 'crypto';
import * as passport from 'passport';

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
    app.enableCors({
      origin: 'http://localhost:3001', 
      credentials: true,
    });
    const configService = app.get(ConfigService);
    const sessionOptions: session.SessionOptions = {
      secret: configService.get<string>('session.secret') as CipherKey,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 360000,
      },
    };

    app.use(session(sessionOptions));
    app.use(passport.initialize());
    app.use(passport.session());

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
