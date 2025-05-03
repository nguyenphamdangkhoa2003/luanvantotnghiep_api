import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { validate } from 'class-validator';
import { Model, HydratedDocument } from 'mongoose';
import slugify from 'slugify';

@Injectable()
export class CommonService {
  private readonly logger = new Logger(CommonService.name);

  /**
   * Format Name
   * Trims and capitalizes every word in a string
   */
  public formatName(title: string): string {
    return title
      .trim()
      .replace(/\n/g, ' ')
      .replace(/\s\s+/g, ' ')
      .replace(/\w\S*/g, (w) => w.replace(/^\w/, (l) => l.toUpperCase()));
  }

  /**
   * Generate Point Slug
   * Creates a slug with dots as word separators
   */
  public generatePointSlug(str: string): string {
    return slugify(str, { lower: true, replacement: '.', remove: /['_\.\-]/g });
  }

  /**
   * Check Entity Existence
   * Verifies if an entity exists, throwing NotFoundException if it doesn't
   */
  public checkEntityExistence<T>(
    entity: HydratedDocument<T> | null | undefined,
    name: string,
  ): void {
    if (!entity) {
      throw new NotFoundException(`${name} not found`);
    }
  }

  /**
   * Save Entity
   * Validates and saves entities to the database
   */
  public async saveEntity<T>(
    model: Model<HydratedDocument<T>>,
    entity: HydratedDocument<T>,
    isNew = false,
  ): Promise<void> {
    await this.validateEntity(entity);

    try {
      if (isNew) {
        await model.create(entity);
      } else {
        await entity.save();
      }
    } catch (error) {
      this.handleMongooseError(error);
    }
  }

  /**
   * Remove Entity
   * Deletes an entity from the database
   */
  public async removeEntity<T>(
    model: Model<HydratedDocument<T>>,
    entity: HydratedDocument<T>,
  ): Promise<void> {
    try {
      await model.deleteOne({ _id: entity._id }).exec();
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Failed to remove entity');
    }
  }

  /**
   * Validate Entity
   * Validates entity using class-validator
   */
  private async validateEntity<T>(entity: T): Promise<void> {
    const errors = await validate(entity as object);
    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: errors.map(error => ({
          property: error.property,
          constraints: error.constraints,
        })),
      });
    }
  }

  /**
   * Handle Mongoose Error
   * Processes Mongoose-specific errors and throws appropriate exceptions
   */
  private handleMongooseError(error: any): void {
    this.logger.error(error);

    if (error.name === 'MongoServerError' && error.code === 11000) {
      throw new ConflictException('Duplicate value in database');
    }

    if (error.name === 'ValidationError') {
      throw new BadRequestException(error.message);
    }

    throw new InternalServerErrorException('Database operation failed');
  }

  /**
   * Throw Internal Error
   * Executes a promise and handles any errors with InternalServerErrorException
   */
  public async throwInternalError<T>(promise: Promise<T>): Promise<T> {
    try {
      return await promise;
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Operation failed');
    }
  }
}