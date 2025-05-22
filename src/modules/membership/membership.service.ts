import { PurchaseMembershipDto } from '@/modules/membership/DTOs/purchase-membership.dto';
import {
  Membership,
  MembershipDocument,
} from '@/modules/membership/schemas/membership.schema';
import { User, UserDocument } from '@/modules/users/schemas/user.schema';
import { VnPayService } from '@/modules/vn-pay/vn-pay.service';
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class MembershipService {
  constructor(
    @InjectModel(Membership.name)
    private membershipModel: Model<MembershipDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private vnPayService: VnPayService,
  ) {}

  private packageConfig = {
    Basic: { acceptRequests: 50, price: 100000, durationDays: 30 },
    Premium: { acceptRequests: 200, price: 300000, durationDays: 30 },
    Pro: { acceptRequests: Infinity, price: 1000000, durationDays: 30 },
  };

  async purchaseMembership(userId: string, dto: PurchaseMembershipDto) {
    const config = this.packageConfig[dto.packageType];
    if (!config) {
      throw new BadRequestException('Invalid package type');
    }

    // Create VNPay payment URL
    const paymentUrl = await this.vnPayService.createPaymentUrl({
      amount: config.price,
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
    const config = this.packageConfig[packageType];

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + config.durationDays);

    // Save membership
    const membership = await this.membershipModel.create({
      userId,
      packageType,
      acceptRequests: config.acceptRequests,
      price: config.price,
      durationDays: config.durationDays,
      startDate,
      endDate,
      status: 'active',
    });

    // Update user
    await this.userModel.updateOne(
      { _id: userId },
      {
        currentMembership: {
          packageType,
          remainingRequests: config.acceptRequests,
          endDate,
        },
      },
    );

    return membership;
  }

  async getMembershipInfo(userId: string) {
    const user = await this.userModel.findById(userId);
    return user?.currentMembership || null;
  }
}
