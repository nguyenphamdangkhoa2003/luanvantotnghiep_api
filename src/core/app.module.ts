import { Logger, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import configuration, {
  configModuleOptions,
} from 'src/config/app/configuration';
import { MongooseModule } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

const dbLogger = new Logger('Database');

const logDatabaseConnection = () => {
  dbLogger.log(
    `\x1b[32m🚀 Database connected successfully! 🌟\x1b[0m\n` +
      `\x1b[33m  🕒 Time: ${new Date().toISOString()}\x1b[0m`,
  );
};

@Module({
  imports: [
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
