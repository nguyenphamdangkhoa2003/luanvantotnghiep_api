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
import { UploadDocumentDto } from '@/modules/users/dto/upload-document.dto';
import { RolesGuard } from '@/modules/auth/guard/role.guard';
import { CreateVehicleDto } from '@/modules/users/dto/create-vehicle.dto';
import { UpdateVehicleDto } from '@/modules/users/dto/update-vehicle.dto';
import { ApproveDto } from '@/modules/users/dto/approve.dto';
import { Types } from 'mongoose';
import { VerifyDocumentDto } from '@/modules/users/dto/verify-document.dto';

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

  @Post('me/documents')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // Giới hạn 5MB
      fileFilter: (req, file, callback) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (!allowedMimes.includes(file.mimetype)) {
          return callback(
            new BadRequestException('Only JPEG, PNG, or PDF files are allowed'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
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
    return this.usersService.getVehicles(new Types.ObjectId(userId));
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
}
