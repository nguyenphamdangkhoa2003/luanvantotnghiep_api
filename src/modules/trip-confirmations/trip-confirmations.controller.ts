import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { TripConfirmationsService } from './trip-confirmations.service';
import { CreateTripConfirmationDto } from '@/modules/trip-confirmations/DTOs/create-trip-confirmation.dto';
import { UpdateTripConfirmationDto } from '@/modules/trip-confirmations/DTOs/update-trip-confirmation.dto';

@Controller('trip-confirmations')
export class TripConfirmationsController {
  constructor(private readonly service: TripConfirmationsService) {}

  @Post()
  create(@Body() dto: CreateTripConfirmationDto) {
    return this.service.create(dto);
  }

  @Get('by-request/:tripRequestId')
  findByRequest(@Param('tripRequestId') tripRequestId: string) {
    return this.service.findByRequest(tripRequestId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTripConfirmationDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
