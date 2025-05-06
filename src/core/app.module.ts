import { Logger, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration, { configModuleOptions } from '@/config/configuration';
import { MongooseModule } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { AuthModule } from '@/modules/auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailModule } from '@/modules/mail/mail.module';
import { CommonModule } from '@/modules/common/common.module';
import { CacheModule } from '@nestjs/cache-manager';

const dbLogger = new Logger('Database');

const logDatabaseConnection = () => {
  dbLogger.log(
    `\x1b[32m🚀 Database connected successfully! 🌟\x1b[0m\n` +
      `\x1b[33m  🕒 Time: ${new Date().toISOString()}\x1b[0m`,
  );
};

@Module({
  imports: [
    MailModule,
    CommonModule,
    ConfigModule.forRoot({
      ...configModuleOptions,
      load: [configuration],
    }),
    MongooseModule.forRoot(configuration().database.url, {
      onConnectionCreate: (connection: Connection) => {
        connection.on('connected', () => {
          logDatabaseConnection();
        });
      },
    }),
    AuthModule,
    CacheModule.register({
      isGlobal: true,
      ttl: configuration().jwt.refresh.time,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
