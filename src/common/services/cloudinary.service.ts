import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('cloudinary.name'),
      api_key: this.configService.get<string>('cloudinary.api_key'),
      api_secret: this.configService.get<string>('cloudinary.api_secret'),
    });
  }

  async uploadFile(file: Express.Multer.File, options: any = {}): Promise<UploadApiResponse> {
    try {
      const result = await new Promise<UploadApiResponse>((resolve, reject) => {
        cloudinary.uploader.upload_stream(options, (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(new Error('Upload failed, no result returned'));
          resolve(result);
        }).end(file.buffer);
      });
      return result;
    } catch (error) {
      throw new BadRequestException(`Failed to upload file to Cloudinary: ${error.message}`);
    }
  }
}
