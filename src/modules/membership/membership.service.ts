import { CreatePackageDto } from '@/modules/membership/DTOs/create-package.dto';
import { PurchaseMembershipDto } from '@/modules/membership/DTOs/purchase-membership.dto';
import { UpdatePackageDto } from '@/modules/membership/DTOs/update-package.dto';

import {
  Membership,
  MembershipDocument,
} from '@/modules/membership/schemas/membership.schema';
import {
  Package,
  PackageDocument,
} from '@/modules/membership/schemas/package.schema';
import { User, UserDocument } from '@/modules/users/schemas/user.schema';
import { VnPayService } from '@/modules/vn-pay/vn-pay.service';
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model, Types } from 'mongoose';
@Injectable()
export class MembershipService {
  constructor(
    @InjectModel(Membership.name)
    private membershipModel: Model<MembershipDocument>,

    @InjectModel(Package.name)
    private packageModel: Model<PackageDocument>,

    @InjectModel(User.name)
    private userModel: Model<UserDocument>,

    private vnPayService: VnPayService,
  ) {}

  /**
   * Admin - Lấy toàn bộ danh sách gói thành viên
   */
  async getAllPackages() {
    return this.packageModel.find().exec();
  }

  /**
   * Admin - Tạo gói thành viên mới
   */
  async createPackage(dto: CreatePackageDto) {
    const exists = await this.packageModel.findOne({ name: dto.name }).exec();
    if (exists) throw new BadRequestException('Tên gói đã tồn tại');

    return this.packageModel.create(dto);
  }

  /**
   * Admin - Cập nhật gói thành viên theo tên
   */
  async updatePackage(packageName: string, dto: UpdatePackageDto) {
    const exists = await this.packageModel
      .findOne({ name: packageName })
      .exec();
    if (!exists) throw new NotFoundException('Không tìm thấy gói');

    return this.packageModel
      .findOneAndUpdate({ name: packageName }, { $set: dto }, { new: true })
      .exec();
  }

  /**
   * Admin - Xóa gói thành viên nếu không có thành viên nào đang dùng
   */
  async deletePackage(packageName: string) {
    const pkg = await this.packageModel.findOne({ name: packageName }).exec();
    if (!pkg) throw new NotFoundException('Không tìm thấy gói');

    const inUse = await this.membershipModel.countDocuments({
      packageType: packageName,
      status: 'active',
    });

    if (inUse > 0)
      throw new ForbiddenException('Gói đang có người dùng, không thể xóa');

    await this.packageModel.findOneAndDelete({ name: packageName }).exec();
    return { message: 'Đã xóa gói thành công' };
  }

  /**
   * Người dùng mua gói thành viên → tạo URL thanh toán VNPay
   */
  async purchaseMembership(userId: string, dto: PurchaseMembershipDto) {
    const pkg = await this.packageModel
      .findOne({ name: dto.packageType })
      .exec();
    if (!pkg) throw new BadRequestException('Gói không hợp lệ');

    const paymentUrl = await this.vnPayService.createPaymentUrl({
      amount: pkg.price,
      orderId: `MEMBERSHIP_${userId}_${Date.now()}`,
      orderInfo: `Purchase ${dto.packageType} membership`,
      userId,
    });

    return { paymentUrl };
  }

  /**
   * Xử lý callback từ VNPay sau khi thanh toán thành công
   */
  async handleVnpayCallback(vnpayData: any) {
    const isValid = await this.vnPayService.verifyCallback(vnpayData);
    if (!isValid)
      throw new BadRequestException('Callback thanh toán không hợp lệ');

    const [_, userId] = vnpayData.vnp_TxnRef.split('_');
    const packageType = vnpayData.vnp_OrderInfo.match(
      /Purchase (\w+) membership/,
    )?.[1];
    if (!packageType)
      throw new BadRequestException('Không tìm thấy loại gói trong callback');

    const pkg = await this.packageModel.findOne({ name: packageType }).exec();
    if (!pkg) throw new BadRequestException('Gói không hợp lệ');

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + pkg.durationDays);

    const membership = await this.membershipModel.create({
      userId,
      packageType,
      acceptRequests: pkg.acceptRequests,
      price: pkg.price,
      durationDays: pkg.durationDays,
      startDate,
      endDate,
      status: 'active',
    });

    await this.userModel.updateOne(
      { _id: userId },
      {
        currentMembership: {
          packageType,
          remainingRequests: pkg.acceptRequests,
          endDate,
        },
      },
    );

    return membership;
  }

  /**
   * Lấy thông tin gói thành viên hiện tại của người dùng
   */
  async getMembershipInfo(userId: string) {
    const user = await this.userModel.findById(userId).exec();
    return user?.currentMembership || null;
  }

  /**
   * Admin - Lấy toàn bộ danh sách membership (dùng populate)
   */
  async findAll(): Promise<Membership[]> {
    const memberships = await this.membershipModel
      .find()
      .populate('userId')
      .exec();
    if (!memberships.length) {
      throw new NotFoundException('Không có gói thành viên nào');
    }
    return memberships;
  }

  /**
   * Tìm gói thành viên hiện tại theo userId
   */
  async findActiveByUserId(userId: string): Promise<Membership | null> {
    return this.membershipModel.findOne({ userId: userId.toString() }).exec();
  }

  /**
   * Cron job chạy mỗi ngày để cập nhật trạng thái membership hết hạn
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async updateExpiredMemberships(): Promise<void> {
    await this.membershipModel.updateMany(
      { endDate: { $lt: new Date() }, status: 'active' },
      { $set: { status: 'expired' } },
    );
  }
}
