// src/modules/reviews/reviews.service.ts
import {
  Review,
  ReviewDocument,
} from '@/modules/reviews/schemas/review.schema';
import { RequestDocument } from '@/modules/routes/schemas/request.schema';
import { Route } from '@/modules/routes/schemas/routes.schema';
import {
  User,
  UserDocument,
  UserRole,
} from '@/modules/users/schemas/user.schema';
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Request.name) private tripRequestModel: Model<RequestDocument>,
  ) {}

  async createReview(
    reviewerId: string,
    revieweeId: string,
    tripRequestId: string,
    rating: number,
    reviewType: 'customer' | 'driver',
    comment?: string,
  ) {
    const tripRequest = (await this.tripRequestModel
      .findById(tripRequestId)
      .populate('routeId')) as any;
    tripRequest.routeId = tripRequest.routeId as Route;
    if (!tripRequest || tripRequest.status !== 'completed') {
      throw new BadRequestException('Invalid or incomplete trip');
    }

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

    const existingReview = await this.reviewModel.findOne({
      reviewer: reviewerId,
      tripRequest: tripRequestId,
      reviewType,
    });
    if (existingReview) {
      throw new BadRequestException('You have rated this trip');
    }

    const review = await this.reviewModel.create({
      reviewer: reviewerId,
      reviewee: revieweeId,
      tripRequest: tripRequestId,
      rating,
      comment,
      reviewType,
    });

    const reviews = await this.reviewModel.find({ reviewee: revieweeId });
    const averageRating =
      reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await this.userModel.findByIdAndUpdate(revieweeId, {
      averageRating,
      ratingCount: reviews.length,
    });

    return review;
  }

  async checkReviewStatus(
    reviewerId: string,
    tripRequestId: string,
  ): Promise<{ hasReviewed: boolean }> {
    const tripRequest = (await this.tripRequestModel
      .findById(tripRequestId)
      .populate('routeId')) as any;
    if (!tripRequest) {
      throw new BadRequestException('Trip request not found');
    }
    tripRequest.routeId = tripRequest.routeId as Route;

    // Kiểm tra reviewerId hợp lệ
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

  async getReviewsGivenByUser(userId: string) {
    return this.reviewModel
      .find({ reviewer: userId })
      .populate('reviewee', 'name')
      .populate('tripRequest', 'startLocation endLocation')
      .exec();
  }

  async getReviewsReceivedByUser(userId: string) {
    return this.reviewModel
      .find({ reviewee: userId })
      .populate('reviewer', 'name')
      .populate('tripRequest', 'startLocation endLocation')
      .exec();
  }
}
