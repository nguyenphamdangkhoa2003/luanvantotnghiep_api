import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  Req,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from '@/modules/reviews/DTOs/create-review.dto';
import { RolesGuard } from '@/modules/auth/guard/role.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { AuthRequest } from '@/types';
import { UserRole } from '@/modules/users/schemas/user.schema';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /**
   * Người dùng tạo đánh giá (review) cho một chuyến đi
   * @param req - Yêu cầu HTTP có chứa thông tin người dùng đã xác thực
   * @param body - Dữ liệu đánh giá được gửi từ client
   */
  @Post()
  async createReview(
    @Request() req: AuthRequest,
    @Body() body: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(
      req.user.id,
      body.revieweeId,
      body.tripRequestId,
      body.rating,
      body.reviewType,
      body.comment,
    );
  }

  /**
   * Kiểm tra xem người dùng đã đánh giá cho chuyến đi cụ thể hay chưa
   * @param tripRequestId - ID của chuyến đi
   * @param reviewerId - ID của người đánh giá
   */
  @Get('check/:tripRequestId')
  async checkReviewStatus(
    @Param('tripRequestId') tripRequestId: string,
    @Query('reviewerId') reviewerId: string,
  ) {
    return this.reviewsService.checkReviewStatus(reviewerId, tripRequestId);
  }

  /**
   * Lấy danh sách review mà người dùng đã tạo
   * @param userId - ID của người dùng
   */
  @Get('given/:userId')
  async getReviewsGivenByUser(@Param('userId') userId: string) {
    return this.reviewsService.getReviewsGivenByUser(userId);
  }

  /**
   * Lấy danh sách review mà người dùng đã nhận
   * @param userId - ID của người dùng
   */
  @Get('received/:userId')
  async getReviewsReceivedByUser(@Param('userId') userId: string) {
    return this.reviewsService.getReviewsReceivedByUser(userId);
  }

  /**
   * Admin - Lấy toàn bộ đánh giá trong hệ thống
   * @returns Danh sách các review
   */
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  async getReviews(@Req() req: AuthRequest) {
    const reviews = await this.reviewsService.getReviews();
    return { data: reviews };
  }
}
