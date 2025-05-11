import { CreatePaymentMethodDto } from '@/modules/payment-methods/DTOs/create-payment-method.dto';
import { PaymentMethodsService } from '@/modules/payment-methods/payment-methods.service';
import { AuthRequest } from '@/types';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
} from '@nestjs/common';

@Controller('users/me/payment-methods')
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}
  @Post()
  async addPaymentMethod(
    @Req() req: AuthRequest,
    @Body() createPaymentMethodDto: CreatePaymentMethodDto,
  ) {
    const userId = req.user['_id'];
    const paymentMethod = await this.paymentMethodsService.addPaymentMethod(
      userId,
      createPaymentMethodDto,
    );
    return {
      message: 'Payment method added successfully',
      data: paymentMethod,
    };
  }

  // Liệt kê phương thức thanh toán
  @Get()
  async getPaymentMethods(@Req() req: AuthRequest) {
    const userId = req.user['_id'];
    const paymentMethods =
      await this.paymentMethodsService.getPaymentMethods(userId);
    return {
      message: 'Payment methods retrieved successfully',
      data: paymentMethods,
    };
  }

  // Xóa phương thức thanh toán
  @Delete(':id')
  async removePaymentMethod(
    @Req() req: AuthRequest,
    @Param('id') paymentMethodId: string,
  ) {
    const userId = req.user['_id'];
    await this.paymentMethodsService.removePaymentMethod(
      userId,
      paymentMethodId,
    );
    return {
      message: 'Payment method removed successfully',
    };
  }

  // Xác minh phương thức thanh toán (n <xaiArtifact>
  @Post(':id/verify')
  async verifyPaymentMethod(
    @Req() req: AuthRequest,
    @Param('id') paymentMethodId: string,
  ) {
    const userId = req.user['_id'];
    const paymentMethod = await this.paymentMethodsService.verifyPaymentMethod(
      userId,
      paymentMethodId,
    );
    return {
      message: 'Payment method verified successfully',
      data: paymentMethod,
    };
  }
}
