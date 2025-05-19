import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@/modules/auth/guard/jwt-auth.guard';
import { UpdateRoleDto } from '@/modules/users/DTOs/update-role.dto';
import { UpdateUserDto } from '@/modules/users/DTOs/update-user.dto';
import { UsersService } from '@/modules/users/users.service';
import { AuthRequest } from '@/types';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from './schemas/user.schema';
import {
  FileFieldsInterceptor,
  FileInterceptor,
  FilesInterceptor,
} from '@nestjs/platform-express';
import { UploadDocumentDto } from '@/modules/users/DTOs/upload-document.dto';
import { RolesGuard } from '@/modules/auth/guard/role.guard';
import { CreateVehicleDto } from '@/modules/users/DTOs/create-vehicle.dto';
import { UpdateVehicleDto } from '@/modules/users/DTOs/update-vehicle.dto';
import { ApproveDto } from '@/modules/users/DTOs/approve.dto';
import { Types } from 'mongoose';
import { VerifyDocumentDto } from '@/modules/users/DTOs/verify-document.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async GetUsers() {
    const data = await this.usersService.getUsers();

    return {
      statusCode: HttpStatus.OK,
      message: 'Get users successfully',
      data,
    };
  }

  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: { fileSize: 5 * 1024 * 1024 }, // Giới hạn 5MB mỗi file
      fileFilter: (req, file, callback) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (!allowedMimes.includes(file.mimetype)) {
          return callback(
            new BadRequestException('Only accept JPEG, PNG or PDF files'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  ) // 'avatar' là field name trong form-data
  async updateAvatar(
    @Req() req: AuthRequest,
    @UploadedFile() avatarFile: Express.Multer.File,
  ) {
    // Check if file is provided
    if (!avatarFile) {
      throw new BadRequestException('Avatar file is required');
    }

    // Get userId from authenticated user (giả định JWT payload chứa userId)
    const userId = req.user['_id']; // Điều chỉnh theo cấu trúc payload của bạn

    // Call service to update avatar
    const result = await this.usersService.updateAvatar(userId, avatarFile);

    return {
      message: 'Avatar updated successfully',
      data: result,
    };
  }

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

  @Post('me/documents')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'frontFile', maxCount: 1 },
        { name: 'backFile', maxCount: 1 },
      ],
      {
        limits: { fileSize: 5 * 1024 * 1024 }, // Giới hạn 5MB mỗi file
        fileFilter: (req, file, callback) => {
          const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
          if (!allowedMimes.includes(file.mimetype)) {
            return callback(
              new BadRequestException('Only accept JPEG, PNG or PDF files'),
              false,
            );
          }
          callback(null, true);
        },
      },
    ),
  )
  async uploadDocument(
    @Req() req: AuthRequest,
    @UploadedFiles()
    files: {
      frontFile?: Express.Multer.File[];
      backFile?: Express.Multer.File[];
    },
    @Body() uploadDocumentDto: UploadDocumentDto,
  ) {
    console.log(files);
    if (!files.frontFile?.[0] || !files.backFile?.[0]) {
      throw new BadRequestException(
        'Both front and back files must be provided.',
      );
    }

    const userId = req.user._id;
    const { type, documentNumber } = uploadDocumentDto;

    const result = await this.usersService.uploadDocument(
      userId,
      files.frontFile[0],
      files.backFile[0],
      type,
      documentNumber,
    );

    return {
      message: 'Document upload successful, awaiting verification',
      data: result,
    };
  }

  @Patch(':userId/:type')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async verifyDocument(
    @Param('userId') userId: string,
    @Param('type') type: 'driverLicense' | 'identityDocument',
    @Body() verifyDocumentDto: VerifyDocumentDto,
  ) {
    if (!['driverLicense', 'identityDocument'].includes(type)) {
      throw new BadRequestException('Invalid document type');
    }
    return this.usersService.approveDocument(
      new Types.ObjectId(userId),
      type,
      verifyDocumentDto,
    );
  }

  @Post('me/vehicles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'registrationDocument', maxCount: 1 },
        { name: 'insuranceDocument', maxCount: 1 },
      ],
      {
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
          if (!file.mimetype.match(/(pdf|image\/(jpeg|png))/)) {
            return cb(
              new Error('Only PDF, JPEG, PNG files are allowed'),
              false,
            );
          }
          cb(null, true);
        },
      },
    ),
  )
  async addVehicle(
    @Req() req: AuthRequest,
    @UploadedFiles()
    files: {
      registrationDocument?: Express.Multer.File[];
      insuranceDocument?: Express.Multer.File[];
    },
    @Body() createVehicleDto: CreateVehicleDto,
  ) {
    return this.usersService.addVehicle(req.user._id, createVehicleDto, files);
  }

  @Get('me/vehicles')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER)
  async getVehicles(@Req() req: AuthRequest) {
    return this.usersService.getVehicles(req.user._id);
  }

  @Patch('me/vehicles/:vehicleId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'registrationDocument', maxCount: 1 },
        { name: 'insuranceDocument', maxCount: 1 },
      ],
      {
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
          if (!file.mimetype.match(/(pdf|image\/(jpeg|png))/)) {
            throw new BadRequestException(
              'Only PDF, JPEG, PNG files are allowed',
            );
          }
          cb(null, true);
        },
      },
    ),
  )
  async updateVehicle(
    @Req() req: AuthRequest,
    @Param('vehicleId') vehicleId: string,
    @UploadedFiles()
    files: {
      registrationDocument?: Express.Multer.File[];
      insuranceDocument?: Express.Multer.File[];
    },
    @Body() updateVehicleDto: UpdateVehicleDto,
  ) {
    return this.usersService.updateVehicle(
      req.user._id,
      vehicleId,
      updateVehicleDto,
      files,
    );
  }

  @Delete('me/vehicles/:vehicleId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteVehicle(@Req() req, @Param('vehicleId') vehicleId: string) {
    return await this.usersService.deleteVehicle(req.user._id, vehicleId);
  }

  @Get(':userId/vehicles')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getUserVehicles(@Param('userId') userId: string) {
    return this.usersService.getVehicles(userId);
  }

  @Patch(':userId/vehicles/:vehicleId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async approveVehicle(
    @Param('userId') userId: string,
    @Param('vehicleId') vehicleId: string,
    @Body() approveDto: ApproveDto,
  ) {
    return this.usersService.approveVehicle(
      new Types.ObjectId(userId),
      vehicleId,
      approveDto,
    );
  }

  @Get(':userId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getUserById(@Param('userId') userId: string) {
    return this.usersService.findUserById(userId);
  }
}
