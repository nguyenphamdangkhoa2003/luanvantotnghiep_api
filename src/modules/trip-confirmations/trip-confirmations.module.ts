import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TripConfirmationsService } from './trip-confirmations.service';
import { TripConfirmationsController } from './trip-confirmations.controller';
import {
  TripConfirmation,
  TripConfirmationSchema,
} from '@/modules/trip-confirmations/Schemas/trip-confirmation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TripConfirmation.name, schema: TripConfirmationSchema },
    ]),
  ],
  controllers: [TripConfirmationsController],
  providers: [TripConfirmationsService],
})
export class TripConfirmationsModule {}
