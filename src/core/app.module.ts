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
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerConfig } from '@/config/throttler.config';
import { APP_GUARD, RouterModule } from '@nestjs/core';
import { JwtAuthGuard } from '@/modules/auth/guard/jwt-auth.guard';
import { JwtAuthModule } from '@/modules/jwt-auth/jwt-auth.module';
import { UsersModule } from '@/modules/users/users.module';
import { RoutesModule } from '@/modules/routes/routes.module';
import { Membership } from '@/modules/membership/schemas/membership.schema';
import { MembershipModule } from '@/modules/membership/membership.module';
import { ReviewsModule } from '@/modules/reviews/reviews.module';

const dbLogger = new Logger('Database');

const logDatabaseConnection = () => {
  dbLogger.log(
    `\x1b[32m🚀 Database connected successfully! 🌟\x1b[0m\n` +
      `\x1b[33m  🕒 Time: ${new Date().toISOString()}\x1b[0m`,
  );
};

@Module({
  imports: [
    RoutesModule,
    UsersModule,
    JwtAuthModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useClass: ThrottlerConfig,
    }),
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
    MembershipModule,
    ReviewsModule,
    CacheModule.register({
      isGlobal: true,
      ttl: configuration().jwt.refresh.time,
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    JwtAuthModule,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
