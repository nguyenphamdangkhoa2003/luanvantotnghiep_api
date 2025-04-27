import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/modules/users/schemas/user.schema';

// This should be a real class/interface representing a user entity

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async findOne(
    username: string,
    isWithPassword = false,
  ): Promise<User | undefined | null> {
    if (isWithPassword)
      return await this.userModel
        .findOne({ username })
        .select('+password')
        .exec();
    return await this.userModel.findOne({ username });
  }
}
