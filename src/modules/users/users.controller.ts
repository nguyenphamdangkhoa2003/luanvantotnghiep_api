import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@/modules/auth/guard/jwt-auth.guard';
import { UpdateRoleDto } from '@/modules/users/dto/update-role.dto';
import { UpdateUserDto } from '@/modules/users/dto/update-user.dto';
import { UsersService } from '@/modules/users/users.service';
import { AuthRequest } from '@/types';
import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from './schemas/user.schema';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadDocumentDto } from '@/modules/users/dto/upload-document.dto';

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

  @Post("me/documents")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Req() req: AuthRequest,
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDocumentDto: UploadDocumentDto,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const userId = req.user._id;
    const { type, documentNumber } = uploadDocumentDto;

    const result = await this.usersService.uploadDocument(
      userId,
      file,
      type,
      documentNumber,
    );

    return {
      message: 'Document uploaded successfully, pending verification',
      data: result,
    };
  }
}
