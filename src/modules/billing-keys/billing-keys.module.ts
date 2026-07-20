import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BillingKeysController } from './billing-keys.controller';
import { BillingKeysRepository } from './billing-keys.repository';
import { BillingKeysService } from './billing-keys.service';
import { TossBillingService } from './toss-billing.service';

@Module({
  imports: [AuthModule],
  controllers: [BillingKeysController],
  providers: [BillingKeysService, BillingKeysRepository, TossBillingService],
})
export class BillingKeysModule {}
