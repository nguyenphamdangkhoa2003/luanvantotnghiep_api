import {
  RefreshToken,
  RefreshTokenSchema,
} from '@/modules/refresh-token/schema/refresh-token.schema';
import { RefreshTokenService } from '@/modules/refresh-token/refresh-token.service';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: RefreshToken.name,
        schema: RefreshTokenSchema,
      },
    ]),
  ],
  providers: [RefreshTokenService],
})
export class RefreshTokenModule {}
