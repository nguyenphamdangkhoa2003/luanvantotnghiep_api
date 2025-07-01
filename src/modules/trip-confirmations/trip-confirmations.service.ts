import { CreateTripConfirmationDto } from '@/modules/trip-confirmations/DTOs/create-trip-confirmation.dto';
import { UpdateTripConfirmationDto } from '@/modules/trip-confirmations/DTOs/update-trip-confirmation.dto';
import {
  TripConfirmation,
  TripConfirmationDocument,
} from '@/modules/trip-confirmations/Schemas/trip-confirmation.schema';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

@Injectable()
export class TripConfirmationsService {
  constructor(
    @InjectModel(TripConfirmation.name)
    private readonly confirmationModel: Model<TripConfirmationDocument>,
  ) {}

  async create(dto: CreateTripConfirmationDto): Promise<TripConfirmation> {
    return this.confirmationModel.create(dto);
  }

  async findByRequest(tripRequestId: string): Promise<TripConfirmation | null> {
    console.log(tripRequestId);
    return this.confirmationModel.findOne({
      tripRequestId: new Types.ObjectId(tripRequestId),
    });
  }

  async update(
    id: string,
    dto: UpdateTripConfirmationDto,
  ): Promise<TripConfirmation> {
    const updated = await this.confirmationModel.findByIdAndUpdate(id, dto, {
      new: true,
    });
    if (!updated) throw new NotFoundException('Confirmation not found');
    return updated;
  }

  async remove(id: string): Promise<void> {
    const result = await this.confirmationModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Confirmation not found');
  }
}
