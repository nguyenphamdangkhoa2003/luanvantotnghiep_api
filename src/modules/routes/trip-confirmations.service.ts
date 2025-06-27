import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TripConfirmation, TripConfirmationDocument } from '../trip-confirmations/Schemas/trip-confirmation.schema';
import { CreateTripConfirmationDto } from '@/modules/trip-confirmations/DTOs/create-trip-confirmation.dto';
import { UpdateTripConfirmationDto } from '@/modules/trip-confirmations/DTOs/update-trip-confirmation.dto';

@Injectable()
export class TripConfirmationsService {
  constructor(
    @InjectModel(TripConfirmation.name)
    private readonly confirmationModel: Model<TripConfirmationDocument>,
  ) {}

  async create(dto: CreateTripConfirmationDto): Promise<TripConfirmationDocument> {
    return this.confirmationModel.create(dto);
  }

  async findByRequest(tripRequestId: string): Promise<TripConfirmationDocument | null> {
    return this.confirmationModel.findOne({ tripRequestId });
  }

  async update(
    id: string,
    dto: UpdateTripConfirmationDto,
  ): Promise<TripConfirmationDocument> {
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
