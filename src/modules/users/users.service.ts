import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IUserQuery } from '@/modules/auth/interfaces/types';
import { CreateUserDto } from '@/modules/users/dto/create-user.dto';
import { User, UserDocument } from '@/modules/users/schemas/user.schema';
import { CommonService } from '@/modules/common/common.service';
import { UpdateUserDto } from '@/modules/users/dto/update-user.dto';
import { ChangeEmailDto } from '@/modules/users/dto/change-email.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private commonService: CommonService,
  ) {}

  /**
   * Find one user by query
   * @param query The query to find the user
   * @param isWithPassword Whether to include the password field
   */
  public async findOne(
    query: IUserQuery,
    isWithPassword = false,
  ): Promise<UserDocument | null> {
    const user = isWithPassword
      ? await this.userModel.findOne(query).select('+password').exec()
      : await this.userModel.findOne(query).exec();
    return user;
  }

  /**
   * Find one user by ID
   * @param id The user ID (string or ObjectId)
   */
  public async findOneById(id: string): Promise<UserDocument> {
    const user = await this.userModel
      .findOne({ _id: new Types.ObjectId(id) })
      .exec();
    this.commonService.checkEntityExistence(user, 'User');
    return user!;
  }

  /**
   * Count users matching a query
   * @param query The query to count users
   */
  public async count(query: IUserQuery): Promise<number> {
    return await this.userModel.countDocuments(query).exec();
  }

  /**
   * Find one user by email
   * @param email The user's email
   */
  public async findOneByEmail(email: string): Promise<UserDocument> {
    const user = await this.userModel
      .findOne({ email: email.toLowerCase() })
      .exec();
    this.throwUnauthorizedException(user);
    return user!;
  }

  /**
   * Throw UnauthorizedException if user is not found
   * @param user The user entity
   */
  private throwUnauthorizedException(user: UserDocument | null): void {
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  /**
   * Find one user by username
   * @param username The user's username
   * @param forAuth Whether this is for authentication purposes
   */
  public async findOneByUsername(
    username: string,
    forAuth = false,
  ): Promise<UserDocument> {
    const user = await this.userModel
      .findOne({ username: username.toLowerCase() })
      .exec();

    if (forAuth) {
      this.throwUnauthorizedException(user);
    } else {
      this.commonService.checkEntityExistence(user, 'User');
    }

    return user!;
  }

  /**
   * Update a user
   * @param userId The user ID (string or ObjectId)
   * @param dto The update data
   */
  public async update(
    userId: string,
    dto: UpdateUserDto,
  ): Promise<UserDocument> {
    const user = await this.findOneById(userId);
    const { name, username } = dto;

    if (name != null && name !== user.name) {
      user.name = this.commonService.formatName(name);
    }

    if (username != null) {
      const formattedUsername = username.toLowerCase();
      if (user.username === formattedUsername) {
        throw new BadRequestException('Username should be different');
      }
      await this.checkUsernameUniqueness(formattedUsername);
      user.username = formattedUsername;
    }

    await this.commonService.saveEntity(this.userModel, user);
    return user;
  }

  /**
   * Check if a username is unique
   * @param username The username to check
   */
  private async checkUsernameUniqueness(username: string): Promise<void> {
    const users = await this.userModel.find({ username }).exec();
    if (users.length > 0) {
      throw new ConflictException('Username already in use');
    }
  }

  public async updateEmail(
    userId: string,
    dto: ChangeEmailDto,
  ): Promise<UserDocument> {
    const user = await this.findOneById(userId);
    const { email, password } = dto;

    if (!(await bcrypt.compare(password, user.password))) {
      throw new BadRequestException('Invalid password');
    }

    const formattedEmail = email.toLowerCase();
    await this.checkEmailUniqueness(formattedEmail);
    user.email = formattedEmail;
    await this.commonService.saveEntity(this.userModel, user);
    return user;
  }

  public async checkEmailUniqueness(email: string): Promise<void> {
    const users = await this.userModel.find({ email });

    if (users.length > 0) {
      throw new ConflictException('Email already in use');
    }
  }

  public async updatePassword(
    userId: string,
    password: string,
    newPassword: string,
  ): Promise<UserDocument> {
    const user = await this.findOneById(userId);

    if (!(await bcrypt.compare(password, user.password))) {
      throw new BadRequestException('Wrong password');
    }
    if (await bcrypt.compare(newPassword, user.password)) {
      throw new BadRequestException('New password must be different');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await this.commonService.saveEntity(this.userModel, user);
    return user;
  }

  public async resetPassword(
    userId: string,
    password: string,
  ): Promise<UserDocument> {
    const user = await this.findOneById(userId);
    user.password = await bcrypt.hash(password, 10);
    await this.commonService.saveEntity(this.userModel, user);
    return user;
  }

  public async create(
    email: string,
    name: string,
    password: string,
  ): Promise<UserDocument> {
    const formattedEmail = email.toLowerCase();
    await this.checkEmailUniqueness(formattedEmail);
    const formattedName = this.commonService.formatName(name);
    const user = await this.userModel.create({
      _id: new Types.ObjectId(),
      email: formattedEmail,
      name: formattedName,
      username: await this.generateUsername(formattedName),
      password: await bcrypt.hash(password, 10),
    });
    await this.commonService.saveEntity(this.userModel, user, true);
    return user;
  }

  private async generateUsername(name: string): Promise<string> {
    const pointSlug = this.commonService.generatePointSlug(name);
    const users = await this.userModel.find({
      username: {
        $regex: `^${pointSlug}`, // Matches usernames starting with pointSlug
        $options: 'i', // Case-insensitive matching (optional)
      },
    });

    if (users.length > 0) {
      return `${pointSlug}${users.length}`;
    }

    return pointSlug;
  }

  public async remove(userId: string): Promise<UserDocument> {
    const user = await this.findOneById(userId);
    await this.commonService.removeEntity(this.userModel, user);
    return user;
  }
}
