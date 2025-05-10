import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@/modules/auth/guard/jwt-auth.guard';
import { UpdateRoleDto } from '@/modules/users/dto/update-role.dto';
import { UpdateUserDto } from '@/modules/users/dto/update-user.dto';
import { UsersService } from '@/modules/users/users.service';
import { AuthRequest } from '@/types';
import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from './schemas/user.schema';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  async updateProfile(
    @Req() req: AuthRequest,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const userId = req.user?._id;
    const updatedUser = await this.usersService.updateProfile(
      userId,
      updateUserDto,
    );
    return {
      statusCode: HttpStatus.OK,
      message: 'Profile updated successfully',
      data: updatedUser,
    };
  }

  @Patch('me/role')
  async updateRole(
    @Req() req: AuthRequest,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    const userId = req.user?._id;
    if (updateRoleDto.role === UserRole.ADMIN) {
      throw new HttpException(
        'Can not change to ADMIN role',
        HttpStatus.FORBIDDEN,
      );
    }
    return this.usersService.updateRole(userId, updateRoleDto);
  }
}
