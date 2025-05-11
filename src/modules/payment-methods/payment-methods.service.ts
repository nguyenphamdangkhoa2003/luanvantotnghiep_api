import { CreatePaymentMethodDto } from '@/modules/payment-methods/DTOs/create-payment-method.dto';
import { User, UserDocument } from '@/modules/users/schemas/user.schema';
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

@Injectable()
export class PaymentMethodsService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async addPaymentMethod(
    userId: Types.ObjectId,
    createPaymentMethodDto: CreatePaymentMethodDto,
  ) {
    const { type, provider, token, last4 } = createPaymentMethodDto;

    const paymentMethod = {
      _id: new Types.ObjectId(),
      type,
      details: { provider, token, last4 },
      isVerified: false,
    };

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    // Khởi tạo paymentMethods nếu chưa có
    user.paymentMethods = user.paymentMethods || [];
    user.paymentMethods.push(paymentMethod);
    console.log("Before save: ",user);
    await user.save();
    console.log("After save: ", user);

    return user.paymentMethods[user.paymentMethods.length - 1];
  }

  async getPaymentMethods(userId: Types.ObjectId) {
    const user = await this.userModel.findById(userId).select('paymentMethods');
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return user.paymentMethods || [];
  }

  async removePaymentMethod(userId: Types.ObjectId, paymentMethodId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    // Kiểm tra paymentMethods có tồn tại
    if (!user.paymentMethods) {
      throw new HttpException('No payment methods found', HttpStatus.NOT_FOUND);
    }

    // Lọc bỏ paymentMethod theo _id
    const initialLength = user.paymentMethods.length;
    user.paymentMethods = user.paymentMethods.filter(
      (method) => method._id.toString() !== paymentMethodId,
    );

    if (user.paymentMethods.length === initialLength) {
      throw new HttpException('Payment method not found', HttpStatus.NOT_FOUND);
    }

    await user.save();
  }

  async verifyPaymentMethod(userId: Types.ObjectId, paymentMethodId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    // Kiểm tra paymentMethods có tồn tại
    if (!user.paymentMethods) {
      throw new HttpException('No payment methods found', HttpStatus.NOT_FOUND);
    }

    const paymentMethod = user.paymentMethods.find(
      (method) => method._id.toString() === paymentMethodId,
    );
    if (!paymentMethod) {
      throw new HttpException('Payment method not found', HttpStatus.NOT_FOUND);
    }

    // Giả lập xác minh (gửi OTP, giao dịch thử,...)
    paymentMethod.isVerified = true;
    await user.save();
    return paymentMethod;
  }
}
