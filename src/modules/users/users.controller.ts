import { JwtAuthGuard } from '@/modules/auth/guard/jwt-auth.guard';
import { UpdateUserDto } from '@/modules/users/dto/update-user.dto';
import { UsersService } from '@/modules/users/users.service';
import { AuthRequest } from '@/types';
import { Body, Controller, HttpCode, HttpStatus, Patch, Req, UseGuards } from '@nestjs/common';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
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
}
