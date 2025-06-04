import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Req,
  Query,
  Delete,
} from '@nestjs/common';
import { MembershipService } from './membership.service';
import { AuthGuard } from '@nestjs/passport';
import { PurchaseMembershipDto } from '@/modules/membership/DTOs/purchase-membership.dto';
import { AuthRequest } from '@/types';
import { Public } from '@/modules/auth/decorators/public.decorators';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { UserRole } from '@/modules/users/schemas/user.schema';
import { RolesGuard } from '@/modules/auth/guard/role.guard';
import { CreatePackageDto } from '@/modules/membership/DTOs/create-package.dto';
import { UpdatePackageDto } from '@/modules/membership/DTOs/update-package.dto';

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
    return this.membershipService.handleVnpayCallback(vnpayData);
  }

  @Get('info/:userId')
  async getMembershipInfo(@Param('userId') userId: string) {
    return this.membershipService.getMembershipInfo(userId);
  }

  @Public()
  @Get('packages')
  async getAllPackages() {
    return this.membershipService.getAllPackages();
  }

  @Post('packages')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async createPackage(@Body() dto: CreatePackageDto) {
    return this.membershipService.createPackage(dto);
  }

  @Post('packages/:packageName')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async updatePackage(
    @Param('packageName') packageName: string,
    @Body() dto: UpdatePackageDto,
  ) {
    return this.membershipService.updatePackage(packageName, dto);
  }

  @Delete('packages/:packageName')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async deletePackage(@Param('packageName') packageName: string) {
    return this.membershipService.deletePackage(packageName);
  }

  
}
