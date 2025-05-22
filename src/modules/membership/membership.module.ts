import { Module } from '@nestjs/common';
import { MembershipController } from './membership.controller';
import { MembershipService } from '@/modules/membership/membership.service';
import { VnPayService } from '@/modules/vn-pay/vn-pay.service';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Membership,
  MembershipSchema,
} from '@/modules/membership/schemas/membership.schema';
import { User, UserSchema } from '@/modules/users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Membership.name,
        schema: MembershipSchema,
      },
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
  ],
  controllers: [MembershipController],
  providers: [MembershipService, VnPayService],
})
export class MembershipModule {}
