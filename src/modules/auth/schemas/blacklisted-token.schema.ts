import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema'; // Giả định đường dẫn đến User schema

// Định nghĩa schema cho BlacklistedToken
@Schema({ collection: 'blacklisted_tokens' })
export class BlacklistedToken {
  @Prop({
    type: String,
    required: true,
    index: true,
  })
  public tokenId: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    required: true,
    index: true,
  })
  public user: MongooseSchema.Types.ObjectId | User;

  @Prop({ type: Date, default: () => new Date() })
  public createdAt: Date;
}

export type BlacklistedTokenDocument = HydratedDocument<BlacklistedToken>;

export const BlacklistedTokenSchema =
  SchemaFactory.createForClass(BlacklistedToken);

BlacklistedTokenSchema.index({ tokenId: 1, user: 1 }, { unique: true });
