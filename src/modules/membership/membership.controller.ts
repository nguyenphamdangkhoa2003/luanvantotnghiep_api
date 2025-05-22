import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { MembershipService } from './membership.service';
import { AuthGuard } from '@nestjs/passport';
import { PurchaseMembershipDto } from '@/modules/membership/DTOs/purchase-membership.dto';
import { AuthRequest } from '@/types';
import { Public } from '@/modules/auth/decorators/public.decorators';

@Controller('membership')
export class MembershipController {
  constructor(private membershipService: MembershipService) {}

  @Post('purchase')
  async purchaseMembership(
    @Body() dto: PurchaseMembershipDto,
    @Req() req: AuthRequest,
  ) {
    return this.membershipService.purchaseMembership(req.user._id, dto);
  }
  @Public()
  @Get('vnpay-callback')
  async handleVnpayCallback(@Query() vnpayData: any) {
    console.log(vnpayData);
    return this.membershipService.handleVnpayCallback(vnpayData);
  }

  @Get('info/:userId')
  async getMembershipInfo(@Param('userId') userId: string) {
    return this.membershipService.getMembershipInfo(userId);
  }
}
