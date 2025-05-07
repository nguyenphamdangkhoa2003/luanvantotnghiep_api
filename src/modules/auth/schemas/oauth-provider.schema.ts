import { OAuthProvidersEnum } from '@/common/enums/oauth-providers.enum';
import { User } from '@/modules/users/schemas/user.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type OAuthProviderDocument = HydratedDocument<OAuthProvider>;

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } })
export class OAuthProvider {
  @Prop({
    type: String,
    enum: OAuthProvidersEnum,
    required: true,
  })
  provider: OAuthProvidersEnum;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  user: User;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const OAuthProviderSchema = SchemaFactory.createForClass(OAuthProvider);

// Đảm bảo tính duy nhất cho cặp provider và user
OAuthProviderSchema.index({ provider: 1, user: 1 }, { unique: true });
