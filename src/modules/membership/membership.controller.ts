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
  NotFoundException,
} from '@nestjs/common';
import { MembershipService } from './membership.service';
import { PurchaseMembershipDto } from '@/modules/membership/DTOs/purchase-membership.dto';
import { AuthRequest } from '@/types';
import { Public } from '@/modules/auth/decorators/public.decorators';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { UserRole } from '@/modules/users/schemas/user.schema';
import { RolesGuard } from '@/modules/auth/guard/role.guard';
import { CreatePackageDto } from '@/modules/membership/DTOs/create-package.dto';
import { UpdatePackageDto } from '@/modules/membership/DTOs/update-package.dto';
import { Membership } from '@/modules/membership/schemas/membership.schema';
import { Response } from 'express';
import { Res } from '@nestjs/common';

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
  async handleVnpayCallback(@Query() vnpayData: any, @Res() res: Response) {
    try {
      await this.membershipService.handleVnpayCallback(vnpayData);
      return res.redirect('http://localhost:3001/driverpass?payment=success');
    } catch (err) {
      return res.redirect('http://localhost:3001/driverpass?payment=fail');
    }
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

  @Get()
  async getAllMemberships(): Promise<Membership[]> {
    return this.membershipService.findAll();
  }

  @Get('me')
  async getActiveMembership(@Req() req: AuthRequest): Promise<Membership> {
    const membership = await this.membershipService.findActiveByUserId(
      req.user._id,
    );
    if (!membership) {
      throw new NotFoundException(
        `No active membership found for user ${req.user._id}`,
      );
    }
    return membership;
  }
}
