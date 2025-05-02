import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RefreshToken } from '@/modules/refresh-token/schema/refresh-token.schema';
import { CreateRefreshTokenDto } from './dto/create-refresh-token.dto';

@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);
  constructor(
    @InjectModel(RefreshToken.name)
    private refreshTokenModel: Model<RefreshToken>,
  ) {}
  async create(data: CreateRefreshTokenDto): Promise<RefreshToken> {
    if (!data.token || !data.userId) {
      throw new BadRequestException('Token and userId are required');
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 3);

    try {
      const refreshToken = await this.refreshTokenModel.create({
        _id: new Types.ObjectId(),
        ...data,
        expiryDate,
      });
      this.logger.log(`Created refresh token for userId: ${data.userId}`);

      return refreshToken;
    } catch (error) {
      this.logger.error(`Failed to create refresh token: ${error.message}`);
      throw new BadRequestException('Failed to create refresh token');
    }
  }

  async findOneAndDelete(token: string): Promise<RefreshToken | null> {
    try {
      const refreshToken = await this.refreshTokenModel
        .findOneAndDelete({ token, expiryDate: { $gte: new Date() } })
        .exec();
      if (!refreshToken) {
        this.logger.warn(`Refresh token not found: ${token}`);
        return null;
      }
      return refreshToken;
    } catch (error) {
      this.logger.error(`Failed to find refresh token: ${error.message}`);
      throw new BadRequestException('Failed to find refresh token');
    }
  }
}
