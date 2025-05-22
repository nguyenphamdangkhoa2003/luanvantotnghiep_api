import { Module } from '@nestjs/common';
import { VnPayService } from './vn-pay.service';

@Module({
  providers: [VnPayService]
})
export class VnPayModule {}
