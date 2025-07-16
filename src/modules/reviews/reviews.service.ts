import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  Review,
  ReviewDocument,
} from '@/modules/reviews/schemas/review.schema';
import {
  Request as TripRequest,
  RequestDocument,
} from '@/modules/routes/schemas/request.schema';
import { Route } from '@/modules/routes/schemas/routes.schema';
import {
  User,
  UserDocument,
  UserRole,
} from '@/modules/users/schemas/user.schema';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(TripRequest.name)
    private tripRequestModel: Model<RequestDocument>,
  ) {}

  /**
   * Tạo đánh giá cho một chuyến đi sau khi hoàn tất
   */
  async createReview(
    reviewerId: string,
    revieweeId: string,
    tripRequestId: string,
    rating: number,
    reviewType: 'customer' | 'driver',
    comment?: string,
  ) {
    // Lấy thông tin request và validate trạng thái hoàn tất
    const tripRequest = await this.tripRequestModel
      .findById(tripRequestId)
      .populate<{ routeId: Route }>('routeId')
      .lean();

    if (!tripRequest || tripRequest.status !== 'completed') {
      throw new BadRequestException('Invalid or incomplete trip');
    }

    // Kiểm tra quyền đánh giá
    const isValidReviewer =
      (reviewType === UserRole.DRIVER &&
        tripRequest.routeId.userId.toString() === reviewerId) ||
      (reviewType === UserRole.CUSTOMER &&
        tripRequest.userId.toString() === reviewerId);

    if (!isValidReviewer) {
      throw new BadRequestException(
        'You are not authorized to rate this trip.',
      );
    }

    // Kiểm tra đánh giá đã tồn tại chưa
    const existingReview = await this.reviewModel.findOne({
      reviewer: reviewerId,
      tripRequest: tripRequestId,
      reviewType,
    });
    if (existingReview) {
      throw new BadRequestException('You have already rated this trip');
    }

    // Tạo đánh giá mới
    const review = await this.reviewModel.create({
      reviewer: reviewerId,
      reviewee: revieweeId,
      tripRequest: tripRequestId,
      rating,
      comment,
      reviewType,
    });

    // Cập nhật điểm trung bình cho người được đánh giá
    const reviews = await this.reviewModel.find({ reviewee: revieweeId });
    const averageRating =
      reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await this.userModel.findByIdAndUpdate(revieweeId, {
      averageRating,
      ratingCount: reviews.length,
    });

    return review;
  }

  /**
   * Kiểm tra người dùng đã đánh giá chuyến đi chưa
   */
  async checkReviewStatus(
    reviewerId: string,
    tripRequestId: string,
  ): Promise<{ hasReviewed: boolean }> {
    const tripRequest = await this.tripRequestModel
      .findById(tripRequestId)
      .populate<{ routeId: Route }>('routeId')
      .lean();

    if (!tripRequest) {
      throw new BadRequestException('Trip request not found');
    }

    const isValidReviewer =
      tripRequest.routeId.userId.toString() === reviewerId ||
      tripRequest.userId.toString() === reviewerId;

    if (!isValidReviewer) {
      throw new BadRequestException(
        'You are not authorized to check this review status.',
      );
    }

    const existingReview = await this.reviewModel.findOne({
      reviewer: reviewerId,
      tripRequest: tripRequestId,
    });

    return { hasReviewed: !!existingReview };
  }

  /**
   * Lấy danh sách các đánh giá mà người dùng đã tạo
   */
  async getReviewsGivenByUser(userId: string) {
    return this.reviewModel
      .find({ reviewer: userId })
      .populate('reviewee', 'name')
      .populate('tripRequest', 'startLocation endLocation')
      .exec();
  }

  /**
   * Lấy danh sách các đánh giá mà người dùng nhận được
   */
  async getReviewsReceivedByUser(userId: string) {
    return this.reviewModel
      .find({ reviewee: userId })
      .populate('reviewer', 'name')
      .populate('tripRequest', 'startLocation endLocation')
      .exec();
  }

  /**
   * Lấy tất cả đánh giá trong hệ thống (dành cho admin)
   */
  async getReviews() {
    try {
      const reviews = await this.reviewModel
        .find()
        .populate('reviewer', 'name email avatar')
        .populate('reviewee', 'name email avatar')
        .populate('tripRequest')
        .exec();

      if (!reviews.length) {
        throw new InternalServerErrorException('No reviews found');
      }

      return reviews;
    } catch (error) {
      console.error('Error fetching reviews:', error);
      throw new InternalServerErrorException('Failed to get reviews');
    }
  }
}
