// src/modules/reviews/reviews.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from '@/modules/reviews/DTOs/create-review.dto';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  async createReview(
    @Request() req,
    @Body()
    body: CreateReviewDto,
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

  @Get('check/:tripRequestId')
  async checkReviewStatus(
    @Param('tripRequestId') tripRequestId: string,
    @Query('reviewerId') reviewerId: string,
  ) {
    return this.reviewsService.checkReviewStatus(reviewerId, tripRequestId);
  }

  @Get('given/:userId')
  async getReviewsGivenByUser(@Param('userId') userId: string) {
    return this.reviewsService.getReviewsGivenByUser(userId);
  }

  @Get('received/:userId')
  async getReviewsReceivedByUser(@Param('userId') userId: string) {
    return this.reviewsService.getReviewsReceivedByUser(userId);
  }
}
