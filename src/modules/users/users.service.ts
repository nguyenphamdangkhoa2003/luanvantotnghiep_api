import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument, UserRole } from './schemas/user.schema';
import * as bcrypt from 'bcrypt';
import { CommonService } from '@/modules/common/common.service';
import { CreateUserDto } from './DTOs/create-user.dto';
import { UpdatePasswordDto } from './DTOs/update-password.dto';
import { ResetPasswordDto } from './DTOs/reset-password.dto';
import * as dayjs from 'dayjs';
import { OAuthProvidersEnum } from '@/common/enums/oauth-providers.enum';
import {
  OAuthProvider,
  OAuthProviderDocument,
} from '@/modules/auth/schemas/oauth-provider.schema';
import { isNull, isUndefined } from '@/common/utils/validation.util';
import { Credentials } from '@/modules/users/schemas/credentials.schema';
import { UpdateUserDto } from '@/modules/users/DTOs/update-user.dto';
import { UpdateRoleDto } from '@/modules/users/DTOs/update-role.dto';
import { VerificationStatus } from '@/common/enums/verification-status.enum';
import { CloudinaryService } from '@/common/services/cloudinary.service';
import { CreateVehicleDto } from '@/modules/users/DTOs/create-vehicle.dto';
import { UpdateVehicleDto } from '@/modules/users/DTOs/update-vehicle.dto';
import { ApproveDto } from '@/modules/users/DTOs/approve.dto';
import { MailService } from '@/modules/mail/mail.service';
import { Vehicle } from '@/modules/users/schemas/vehicle.schema';
import { DriverLicense } from '@/modules/users/schemas/driver-license.schema';
import { IdentityDocument } from '@/modules/users/schemas/identity-document.schema';
import { VerifyDocumentDto } from '@/modules/users/DTOs/verify-document.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name, { timestamp: true });

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(OAuthProvider.name)
    private readonly oauthProviderModel: Model<OAuthProviderDocument>,
    private readonly commonService: CommonService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly mailService: MailService,
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
    let user = await this.userModel
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
      // Thêm provider mới nếu chưa có
      await this.createOAuthProvider(data.provider, user._id.toString());
      // Refresh user để cập nhật oauthProviders
      user = await this.userModel
        .findOne({ email: formattedEmail })
        .populate('oauthProviders')
        .exec();
    }

    const updatedData: Partial<User> = {
      ...data,
      updatedAt: new Date(), // Cập nhật thời gian sửa đổi
    };

    // Cập nhật người dùng trong database
    user = await this.userModel
      .findOneAndUpdate(
        { email: formattedEmail },
        { $set: updatedData },
        { new: true, runValidators: true }, // Trả về document mới và chạy validator
      )
      .populate('oauthProviders')
      .exec();
    await this.commonService.checkEntityExistence(user, User.name);
    return user!;
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
    const user = await this.userModel.findById(id).select('+password');
    await this.commonService.checkEntityExistence(user, User.name);
    return user;
  }

  public async findOAuthProviders(
    userId: number,
  ): Promise<OAuthProviderDocument[]> {
    return await this.oauthProviderModel
      .find({ user: userId })
      .sort({ provider: 1 });
  }

  async updateProfile(
    userId: string,
    updateUserDto: UpdateUserDto,
  ): Promise<User> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updateData: Partial<User> = {};
    if (updateUserDto.name) updateData.name = updateUserDto.name;
    if (updateUserDto.phoneNumber)
      updateData.phoneNumber = updateUserDto.phoneNumber;
    if (updateUserDto.dateOfBirth)
      updateData.dateOfBirth = updateUserDto.dateOfBirth;
    if (updateUserDto.avatar) updateData.avatar = updateUserDto.avatar;
    if (updateUserDto.bio) updateData.bio = updateUserDto.bio;

    updateData.updatedAt = new Date();

    const updatedUser = await this.userModel
      .findByIdAndUpdate(userId, { $set: updateData }, { new: true })
      .select('-password -credentials -oauthProviders')
      .exec();

    if (!updatedUser) {
      throw new BadRequestException('Failed to update profile');
    }

    return updatedUser;
  }

  async updateRole(
    userId: string,
    updateRoleDto: UpdateRoleDto,
  ): Promise<User> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    // Kiểm tra nếu chuyển sang DRIVER
    if (updateRoleDto.role === UserRole.DRIVER) {
      if (
        !user.driverLicense ||
        user.driverLicense.verificationStatus !== VerificationStatus.APPROVED
      ) {
        throw new HttpException(
          'A verified driver license is required to become a driver',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // Cập nhật vai trò
    user.role = updateRoleDto.role;
    user.updatedAt = new Date();

    await user.save();
    return user;
  }
  async approveDocument(
    userId: Types.ObjectId,
    type: 'driverLicense' | 'identityDocument',
    verifyDocumentDto: VerifyDocumentDto,
  ) {
    const { action, reason } = verifyDocumentDto;

    // Kiểm tra action hợp lệ
    if (!['approve', 'reject'].includes(action)) {
      throw new BadRequestException('Invalid action');
    }

    // Kiểm tra lý do khi reject
    if (action === 'reject' && !reason) {
      throw new BadRequestException('Reason is required for rejection');
    }

    // Tìm user
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Kiểm tra tài liệu tồn tại
    if (!user[type]) {
      throw new BadRequestException(`${type} not found`);
    }

    // Chuẩn bị dữ liệu cập nhật
    const setData: any = {};
    const isApproved = action === 'approve';
    const verificationStatus = isApproved
      ? VerificationStatus.APPROVED
      : VerificationStatus.REJECTED;

    setData[`${type}.verificationStatus`] = verificationStatus;
    if (isApproved) {
      setData[`${type}.verifiedAt`] = new Date();
    }

    // Cập nhật user
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        { $set: setData },
        { new: true, runValidators: true },
      )
      .select('email driverLicense identityDocument');

    console.log('updatedUser', updatedUser);

    // Chuẩn bị email
    const emailSubject = `${type === 'driverLicense' ? 'Driver License' : 'Identity Document'} Verification ${
      isApproved ? 'Approved' : 'Rejected'
    }`;
    const emailTemplate = isApproved
      ? 'document_approved'
      : 'document_rejected';

    // Gửi email thông báo
    await this.mailService.sendMail(user.email, emailSubject, emailTemplate, {
      name: user.name,
      email: user.email,
      documentType: type,
      reason: reason,
    });

    return {
      message: `Document ${type} ${action}d successfully`,
      data: {
        type,
        verificationStatus,
        ...(reason && { reason }),
      },
    };
  }

  async uploadDocument(
    userId: string,
    file: Express.Multer.File,
    type: 'driverLicense' | 'identityDocument',
    documentNumber: string,
  ) {
    // Kiểm tra loại tài liệu hợp lệ
    if (!['driverLicense', 'identityDocument'].includes(type)) {
      throw new BadRequestException('Invalid document type');
    }

    // Kiểm tra định dạng file
    const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, or PDF files are allowed');
    }

    // Tải file lên Cloudinary
    const uploadResult = await this.cloudinaryService.uploadFile(file, {
      folder: `xeshare/documents/${type}/${userId}`,
      resource_type: 'auto',
    });

    // Cập nhật schema User
    const updateData: any = {};
    if (type === 'driverLicense') {
      updateData.driverLicense = {
        licenseNumber: documentNumber,
        licenseImage: uploadResult.secure_url,
        verificationStatus: VerificationStatus.PENDING,
      };
    } else {
      updateData.identityDocument = {
        documentNumber,
        documentImage: uploadResult.secure_url,
        verificationStatus: VerificationStatus.PENDING,
      };
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true },
      )
      .select('driverLicense identityDocument');

    if (!updatedUser) {
      throw new BadRequestException('User not found');
    }

    return {
      type,
      documentNumber,
      documentImage: uploadResult.secure_url,
      verificationStatus: VerificationStatus.PENDING,
    };
  }

  async addVehicle(
    userId: string,
    createVehicleDto: CreateVehicleDto,
    files: {
      registrationDocument?: Express.Multer.File[];
      insuranceDocument?: Express.Multer.File[];
    },
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role !== 'driver') {
      throw new ForbiddenException('Only drivers can add vehicles');
    }

    // Upload file to Cloudinary
    const uploadFile = async (file: Express.Multer.File, type: string) => {
      const result = await this.cloudinaryService.uploadFile(file, {
        folder: `xeshare/vehicle/${type}`,
        resource_type: 'auto',
        public_id: `${type}-${Date.now()}-${file.originalname}`,
      });
      return result.secure_url;
    };

    const vehicle = {
      ...createVehicleDto,
      registrationDocument: files.registrationDocument
        ? await uploadFile(files.registrationDocument[0], 'registration')
        : undefined,
      insuranceDocument: files.insuranceDocument
        ? await uploadFile(files.insuranceDocument[0], 'insurance')
        : undefined,
      verificationStatus: VerificationStatus.PENDING,
      verifiedAt: undefined,
      _id: new Types.ObjectId(),
    };

    if (vehicle.registrationDocument == undefined) {
      throw new ForbiddenException('Registration document is required');
    }

    // Ép kiểu để khớp với Vehicle
    const validatedVehicle: Vehicle = {
      ...vehicle,
      registrationDocument: vehicle.registrationDocument as string,
      insuranceDocument: vehicle.insuranceDocument as string,
    };

    user.vehicles = user.vehicles || [];
    user.vehicles.push(validatedVehicle);
    await user.save();

    return validatedVehicle;
  }

  async getVehicles(userId: string) {
    const user = await this.userModel.findById(userId).select('vehicles');
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user.vehicles || [];
  }

  async updateVehicle(
    userId: string,
    vehicleId: string,
    updateVehicleDto: UpdateVehicleDto,
    files: {
      registrationDocument?: Express.Multer.File[];
      insuranceDocument?: Express.Multer.File[];
    },
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role !== 'driver') {
      throw new ForbiddenException('Only drivers can update vehicles');
    }

    const vehicle = user.vehicles?.find((v) => v._id.toString() === vehicleId);
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    // Upload file to Cloudinary if provided
    const uploadFile = async (file: Express.Multer.File, type: string) => {
      const result = await this.cloudinaryService.uploadFile(file, {
        folder: `xeshare/vehicle/${type}`,
        resource_type: 'auto',
        public_id: `${type}-${Date.now()}-${file.originalname}`,
      });
      if (!result.secure_url) {
        throw new InternalServerErrorException(
          `Failed to upload ${type} document`,
        );
      }
      return result.secure_url;
    };

    // Cập nhật các trường file nếu có
    if (files.registrationDocument) {
      vehicle.registrationDocument = await uploadFile(
        files.registrationDocument[0],
        'registration',
      );
      vehicle.verificationStatus = VerificationStatus.PENDING;
      vehicle.verifiedAt = undefined;
    }
    if (files.insuranceDocument) {
      vehicle.insuranceDocument = await uploadFile(
        files.insuranceDocument[0],
        'insurance',
      );
      vehicle.verificationStatus = VerificationStatus.PENDING;
      vehicle.verifiedAt = undefined;
    }

    for (const [key, value] of Object.entries(updateVehicleDto)) {
      if (value !== undefined) {
        vehicle[key] = value;
      }
    }

    user.markModified('vehicles');

    await user.save();

    return vehicle;
  }

  async deleteVehicle(userId: Types.ObjectId, vehicleId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role !== 'driver') {
      throw new ForbiddenException('Only drivers can delete vehicles');
    }

    const vehicleIndex = user.vehicles?.findIndex(
      (v) => v._id.toString() === vehicleId,
    );
    if (vehicleIndex === -1 || vehicleIndex === undefined) {
      throw new NotFoundException('Vehicle not found');
    }

    user.vehicles?.splice(vehicleIndex, 1);
    await user.save();

    return this.commonService.generateMessage('Delete successful');
  }

  async approveVehicle(
    userId: Types.ObjectId,
    vehicleId: string,
    approveDto: ApproveDto,
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const vehicle = user.vehicles?.find((v) => v._id.toString() === vehicleId);
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    vehicle.verificationStatus = approveDto.verificationStatus;
    vehicle.verifiedAt =
      approveDto.verificationStatus === VerificationStatus.APPROVED
        ? new Date()
        : undefined;

    await user.save();

    const template =
      approveDto.verificationStatus === VerificationStatus.APPROVED
        ? 'vehicle_approved'
        : 'vehicle_rejected';
    const subject =
      approveDto.verificationStatus === VerificationStatus.APPROVED
        ? 'Vehicle Verification Approved'
        : 'Vehicle Verification Rejected';

    try {
      await this.mailService.sendMail(user.email, subject, template, {
        name: user.name,
        email: user.email,
        reason: approveDto.rejectionReason,
        licensePlate: vehicle.licensePlate,
        rejectionReason: approveDto.rejectionReason || 'No reason provided',
        uploadLink: '#',
      });
    } catch (error) {
      console.error(`Failed to send email to ${user.email}:`, error);
    }

    return vehicle;
  }
}
