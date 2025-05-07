import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import * as bcrypt from 'bcrypt';
import { CommonService } from '@/modules/common/common.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import * as dayjs from 'dayjs';
import { OAuthProvidersEnum } from '@/common/enums/oauth-providers.enum';
import {
  OAuthProvider,
  OAuthProviderDocument,
} from '@/modules/auth/schemas/oauth-provider.schema';
import { isNull, isUndefined } from '@/common/utils/validation.util';
import { Credentials } from '@/modules/users/schemas/credentials.schema';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name, { timestamp: true });

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(OAuthProvider.name)
    private readonly oauthProviderModel: Model<OAuthProviderDocument>,
    private readonly commonService: CommonService,
  ) {}

  // Tạo người dùng mới
  // Highlights: Tạo người dùng với email, tên và mật khẩu từ DTO
  async create(
    provider: OAuthProvidersEnum,
    dto: CreateUserDto,
  ): Promise<UserDocument> {
    const { email, name, password } = dto;
    const isConfirmed = provider !== OAuthProvidersEnum.LOCAL;
    const formattedEmail = email.toLowerCase();
    const formattedName = this.commonService.formatName(name);

    await this.checkEmailUniqueness(formattedEmail);

    this.logger.log(`Tạo người dùng mới với email: ${email}`);

    const user = new this.userModel({
      ...dto,
      _id: new Types.ObjectId(),
      email: formattedEmail,
      name: formattedName,
      username: await this.generateUsername(formattedName),
      password: isUndefined(password)
        ? 'UNSET'
        : await bcrypt.hash(password, 10),
      credentials: new Credentials(isConfirmed),
      isEmailVerified: isConfirmed,
      oauthProviders: [],
    });
    // Queries: Lưu người dùng
    await this.commonService.saveEntity(this.userModel, user, true);
    this.logger.debug(`Lưu người dùng: ${user.email}`);
    await this.oauthProviderModel.findOne({ provider, user: user._id }).exec();

    const oauthProvider = await this.createOAuthProvider(
      provider,
      user._id.toString(),
    );
    // Cập nhật mảng oauthProviders trong User
    await this.userModel.updateOne(
      { _id: user._id },
      { $addToSet: { oauthProviders: oauthProvider._id } },
    );

    const userRs = await this.userModel
      .findById(user._id)
      .populate('oauthProviders');
    this.commonService.checkEntityExistence(userRs, User.name);
    return userRs!;
  }

  public async findOrCreate(data: CreateUserDto): Promise<User> {
    const formattedEmail = data.email.toLowerCase();

    // Tìm người dùng với email và populate oauthProviders
    const user = await this.userModel
      .findOne({ email: formattedEmail })
      .populate('oauthProviders')
      .exec();
    if (!user) {
      return this.create(data.provider, { ...data });
    }

    const hasProvider = user.oauthProviders.some(
      (p: OAuthProvider) => p.provider === data.provider,
    );

    if (!hasProvider) {
      await this.createOAuthProvider(data.provider, user._id.toString());
    }

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
  public async checkEmailUniqueness(email: string): Promise<void> {
    const users = await this.userModel.find({ email });

    if (users.length > 0) {
      throw new ConflictException('Email already in use');
    }
  }
  // Tìm người dùng theo email
  // Highlights: Tìm người dùng với email, trả về null nếu không tồn tại
  async findOneByEmail(email: string): Promise<UserDocument | null> {
    // Alerts: Kiểm tra email không rỗng
    if (!email) {
      throw new BadRequestException(
        this.commonService.generateMessage('Email không được cung cấp'),
      );
    }

    // Queries: Tìm người dùng theo email
    const user = await this.userModel
      .findOne({ email: email.toLowerCase() })
      .exec();
    this.logger.debug(`Tìm người dùng với email: ${email}`);
    return user;
  }

  // Tìm người dùng theo username
  // Highlights: Tìm người dùng với username, tùy chọn ẩn mật khẩu
  async findOneByUsername(
    username: string,
    sensitive = false,
  ): Promise<UserDocument | null> {
    // Alerts: Kiểm tra username không rỗng
    if (!username) {
      throw new BadRequestException(
        this.commonService.generateMessage(
          'Tên người dùng không được cung cấp',
        ),
      );
    }

    // Queries: Tìm người dùng theo username
    const query = this.userModel.findOne({ username: username.toLowerCase() });
    if (!sensitive) {
      query.select('-credentials.lastPassword');
    }
    const user = await query.exec();
    this.logger.debug(`Tìm người dùng với username: ${username}`);
    return user;
  }

  // Tìm người dùng theo ID và phiên bản credentials
  // Highlights: Xác minh người dùng với ID và version để đảm bảo token hợp lệ
  async findOneByCredentials(
    id: string,
    version: number,
  ): Promise<UserDocument | null> {
    // Alerts: Kiểm tra ID hợp lệ
    if (!Types.ObjectId.isValid(id)) {
      this.logger.error(`ID người dùng không hợp lệ: ${id}`);
      throw new BadRequestException(
        this.commonService.generateMessage('ID người dùng không hợp lệ'),
      );
    }

    // Alerts: Kiểm tra version hợp lệ
    if (!Number.isInteger(version) || version < 0) {
      this.logger.error(`Version không hợp lệ: ${version}`);
      throw new BadRequestException(
        this.commonService.generateMessage('Version không hợp lệ'),
      );
    }

    this.logger.debug(`Tìm người dùng với ID: ${id} và version: ${version}`);

    // Queries: Tìm người dùng với _id và version
    const user = await this.userModel
      .findOne({ _id: new Types.ObjectId(id), 'credentials.version': version })
      .exec();

    if (!user) {
      this.logger.warn(
        `Không tìm thấy người dùng với ID: ${id}, version: ${version}`,
      );
    } else {
      this.logger.debug(`Tìm thấy người dùng: ${user.email}`);
    }

    return user;
  }

  // Tìm người dùng theo email mà không kiểm tra trạng thái
  // Highlights: Dùng để kiểm tra email mà không cần xác minh
  async uncheckedUserByEmail(email: string): Promise<UserDocument | null> {
    // Alerts: Kiểm tra email không rỗng
    if (!email) {
      throw new BadRequestException(
        this.commonService.generateMessage('Email không được cung cấp'),
      );
    }

    // Queries: Tìm người dùng theo email
    const user = await this.userModel
      .findOne({ email: email.toLowerCase() })
      .lean()
      .exec();
    this.logger.debug(`Tìm người dùng không kiểm tra với email: ${email}`);
    return user;
  }

  // Cập nhật mật khẩu của người dùng
  // Highlights: Kiểm tra mật khẩu cũ, đảm bảo mật khẩu mới khác và cập nhật credentials
  async updatePassword(
    dto: UpdatePasswordDto,
    userId: string,
  ): Promise<UserDocument> {
    // Alerts: Kiểm tra ID hợp lệ
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException(
        this.commonService.generateMessage('ID người dùng không hợp lệ'),
      );
    }
    const user = await this.findOneById(new Types.ObjectId(userId));
    if (!user) throw new NotFoundException();
    const { oldPassword, newPassword } = dto;

    if (user.password === 'UNSET') {
      await this.createOAuthProvider(OAuthProvidersEnum.LOCAL, user.id);
    } else {
      if (isUndefined(oldPassword) || isNull(oldPassword)) {
        throw new BadRequestException('Mật khẩu là bắt buộc');
      }
      if (!(await bcrypt.compare(oldPassword, user.password))) {
        throw new BadRequestException('Mật khẩu sai');
      }
      if (await bcrypt.compare(newPassword, user.password)) {
        throw new BadRequestException('Mật khẩu mới phải khác');
      }
    }

    return await this.changePassword(user, newPassword);
  }

  // Đặt lại mật khẩu của người dùng
  // Highlights: Sử dụng token để xác minh và cập nhật mật khẩu
  async resetPassword(dto: ResetPasswordDto): Promise<UserDocument> {
    const { userId, password, version } = dto;

    // Alerts: Kiểm tra ID hợp lệ
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException(
        this.commonService.generateMessage('ID người dùng không hợp lệ'),
      );
    }
    // Queries: Tìm người dùng với ID và version
    const user = await this.findOneByCredentials(userId, version);
    if (!user) {
      throw new NotFoundException(
        this.commonService.generateMessage('Người dùng không tồn tại'),
      );
    }

    this.logger.log(`Bắt đầu đặt lại mật khẩu cho người dùng: ${userId}`);

    // Queries: Cập nhật mật khẩu và credentials
    user.credentials.updatePassword(user.password);
    user.password = password;

    // Queries: Lưu thay đổi
    await this.changePassword(user, password);
    this.logger.log(`Đặt lại mật khẩu thành công cho người dùng ${userId}`);

    return user;
  }

  // Cập nhật trạng thái xác nhận email của người dùng
  // Highlights: Cập nhật trường isEmailVerified trong document User
  async updateEmailVerified(id: string, isVerified: boolean): Promise<void> {
    // Alerts: Kiểm tra ID hợp lệ
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        this.commonService.generateMessage('ID người dùng không hợp lệ'),
      );
    }

    // Queries: Tìm và cập nhật người dùng
    const result = await this.userModel
      .updateOne(
        { _id: new Types.ObjectId(id) },
        { isEmailVerified: isVerified },
      )
      .exec();

    // Alerts: Kiểm tra xem có bản ghi nào được cập nhật hay không
    if (result.matchedCount === 0) {
      throw new NotFoundException(
        this.commonService.generateMessage('Người dùng không tồn tại'),
      );
    }

    this.logger.log(
      `Cập nhật trạng thái xác nhận email cho người dùng ${id}: ${isVerified}`,
    );
  }

  private async createOAuthProvider(
    provider: OAuthProvidersEnum,
    userId: string,
  ): Promise<OAuthProviderDocument> {
    const oauthProvider = await this.oauthProviderModel.create({
      provider,
      user: userId,
    });
    await this.commonService.saveEntity(
      this.oauthProviderModel,
      oauthProvider,
      true,
    );
    return oauthProvider;
  }

  private async changePassword(
    user: UserDocument,
    password: string,
  ): Promise<UserDocument> {
    user.credentials.updatePassword(user.password);
    user.password = await bcrypt.hash(password, 10);
    await this.commonService.saveEntity(this.userModel, user);
    return user;
  }

  public async findOneById(id: Types.ObjectId): Promise<UserDocument | null> {
    const user = await this.userModel.findOne({ id }).select('+password');
    this.commonService.checkEntityExistence(user, User.name);
    return user;
  }

  public async findOAuthProviders(
    userId: number,
  ): Promise<OAuthProviderDocument[]> {
    return await this.oauthProviderModel
      .find({ user: userId })
      .sort({ provider: 1 });
  }
}
