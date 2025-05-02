import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserQuery } from '@/modules/auth/interfaces/types';
import { CreateUserDto } from '@/modules/users/dto/create-user.dto';
import { User } from '@/modules/users/schemas/user.schema';

// This should be a real class/interface representing a user entity

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async findOne(
    query: UserQuery,
    isWithPassword = false,
  ): Promise<User | undefined | null> {
    if (isWithPassword)
      return await this.userModel.findOne(query).select('+password').exec();
    return await this.userModel.findOne(query);
  }

  async create(data: CreateUserDto) {
    const user = new this.userModel({ _id: new Types.ObjectId(), ...data });
    return user.save();
  }
}
