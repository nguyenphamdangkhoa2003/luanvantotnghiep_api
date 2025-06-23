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

  // Admin: Get all packages
  async getAllPackages() {
    return this.packageModel.find().exec();
  }

  // Admin: Create new package
  async createPackage(dto: CreatePackageDto) {
    const existingPackage = await this.packageModel
      .findOne({ name: dto.name })
      .exec();
    if (existingPackage) {
      throw new BadRequestException('Package name already exists');
    }

    const newPackage = await this.packageModel.create({
      name: dto.name,
      acceptRequests: dto.acceptRequests,
      price: dto.price,
      durationDays: dto.durationDays,
      description: dto.description,
    });

    return newPackage;
  }

  // Admin: Update package
  async updatePackage(packageName: string, dto: UpdatePackageDto) {
    const packageDoc = await this.packageModel
      .findOne({ name: packageName })
      .exec();
    if (!packageDoc) {
      throw new NotFoundException('Package not found');
    }

    const updatedPackage = await this.packageModel
      .findOneAndUpdate(
        { name: packageName },
        { $set: { ...dto } },
        { new: true },
      )
      .exec();

    return updatedPackage;
  }

  // Admin: Delete package
  async deletePackage(packageName: string) {
    const packageDoc = await this.packageModel
      .findOne({ name: packageName })
      .exec();
    if (!packageDoc) {
      throw new NotFoundException('Package not found');
    }

    // Check if any active memberships use this package
    const activeMemberships = await this.membershipModel.countDocuments({
      packageType: packageName,
      status: 'active',
    });

    if (activeMemberships > 0) {
      throw new ForbiddenException(
        'Cannot delete package with active memberships',
      );
    }

    await this.packageModel.findOneAndDelete({ name: packageName }).exec();

    return { message: 'Package deleted successfully' };
  }

  async purchaseMembership(userId: string, dto: PurchaseMembershipDto) {
    const packageDoc = await this.packageModel
      .findOne({
        name: dto.packageType,
      })
      .exec();
    if (!packageDoc) {
      throw new BadRequestException('Invalid package type');
    }

    const paymentUrl = await this.vnPayService.createPaymentUrl({
      amount: packageDoc.price,
      orderId: `MEMBERSHIP_${userId}_${Date.now()}`,
      orderInfo: `Purchase ${dto.packageType} membership`,
      userId,
    });

    return { paymentUrl };
  }

  async handleVnpayCallback(vnpayData: any) {
    const isValid = await this.vnPayService.verifyCallback(vnpayData);
    if (!isValid) {
      throw new BadRequestException('Invalid payment callback');
    }

    const txnRefParts = vnpayData.vnp_TxnRef.split('_');
    const userId = txnRefParts[1];
    const packageType = vnpayData.vnp_OrderInfo.match(
      /Purchase (\w+) membership/,
    )[1];

    const packageDoc = await this.packageModel
      .findOne({
        name: packageType,
      })
      .exec();
    if (!packageDoc) {
      throw new BadRequestException('Invalid package type');
    }

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + packageDoc.durationDays);

    const membership = await this.membershipModel.create({
      userId,
      packageType,
      acceptRequests: packageDoc.acceptRequests,
      price: packageDoc.price,
      durationDays: packageDoc.durationDays,
      startDate,
      endDate,
      status: 'active',
    });

    await this.userModel.updateOne(
      { _id: userId },
      {
        currentMembership: {
          packageType,
          remainingRequests: packageDoc.acceptRequests,
          endDate,
        },
      },
    );

    return membership;
  }

  async getMembershipInfo(userId: string) {
    const user = await this.userModel.findById(userId).exec();
    return user?.currentMembership || null;
  }

  async findAll(): Promise<Membership[]> {
    const memberships = await this.membershipModel
      .find()
      .populate('userId') // Lấy chi tiết user từ reference
      .exec();

    if (!memberships || memberships.length === 0) {
      throw new NotFoundException('No membership packages found.');
    }

    return memberships;
  }

  async findActiveByUserId(userId: string): Promise<Membership | null> {
    return this.membershipModel
      .findOne({
        userId: userId.toString(),
      })
      .exec();
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async updateExpiredMemberships(): Promise<void> {
    const currentDate = new Date();

    await this.membershipModel.updateMany(
      {
        endDate: { $lt: currentDate },
        status: 'active',
      },
      {
        $set: { status: 'expired' },
      },
    );
  }
}
