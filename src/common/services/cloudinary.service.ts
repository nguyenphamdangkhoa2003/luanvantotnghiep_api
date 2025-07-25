import { Injectable, BadRequestException } from '@nestjs/common';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiOptions,
} from 'cloudinary';
import { ConfigService } from '@nestjs/config';
import { promisify } from 'util';
import { CLOUDINARY_PUBLIC_ID_REGEX } from '@/common/constants/regex.constant';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  // Sử dụng promisify để chuyển từ callback sang Promise cho upload_stream
  private readonly uploadStream = promisify(
    cloudinary.uploader.upload_stream.bind(cloudinary.uploader),
  );

  constructor(private readonly configService: ConfigService) {
    // Cấu hình Cloudinary với thông tin từ biến môi trường
    cloudinary.config({
      cloud_name: this.configService.get<string>('cloudinary.name'),
      api_key: this.configService.get<string>('cloudinary.api_key'),
      api_secret: this.configService.get<string>('cloudinary.api_secret'),
    });
  }

  /**
   * Tải lên file từ buffer lên Cloudinary bằng cách sử dụng upload_stream.
   *
   * @param file - File tải lên từ Multer (Express)
   * @param options - Các tùy chọn upload (ví dụ: folder, public_id,...)
   * @returns Kết quả phản hồi từ Cloudinary sau khi upload
   * @throws BadRequestException nếu upload thất bại
   */
  async uploadFile(
  file: Express.Multer.File,
  options: UploadApiOptions = {},
): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        ...options,
        resource_type: options.resource_type ?? 'auto',
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result as UploadApiResponse);
      },
    );

    // Tạo một stream từ buffer
    const readable = Readable.from(file.buffer);
    readable.pipe(uploadStream); // Gửi dữ liệu lên Cloudinary
  });
}

  /**
   * Trích xuất publicId từ một URL Cloudinary.
   *
   * @param url - URL đầy đủ của file trên Cloudinary
   * @returns publicId nếu trích xuất thành công, ngược lại trả về null
   */
  getPublicIdFromUrl(url: string): string | null {
    const matches = url.match(CLOUDINARY_PUBLIC_ID_REGEX);
    return matches ? matches[1] : null;
  }

  /**
   * Xóa file trên Cloudinary bằng publicId và loại tài nguyên.
   *
   * @param publicId - ID duy nhất của file cần xóa trên Cloudinary
   * @param resourceType - Loại tài nguyên: 'image', 'video', 'raw', mặc định là 'image'
   * @throws BadRequestException nếu xóa thất bại
   */
  async deleteFile(
    publicId: string,
    resourceType: string = 'image',
  ): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });
    } catch (error) {
      throw new BadRequestException(
        `Failed to delete file from Cloudinary: ${error?.message || error}`,
      );
    }
  }
}
