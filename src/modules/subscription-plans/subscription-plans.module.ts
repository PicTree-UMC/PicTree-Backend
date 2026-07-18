import { Module } from '@nestjs/common';
import { SubscriptionPlansController } from './subscription-plans.controller';
import { SubscriptionPlansRepository } from './subscription-plans.repository';
import { SubscriptionPlansService } from './subscription-plans.service';

@Module({
  controllers: [SubscriptionPlansController],
  providers: [SubscriptionPlansService, SubscriptionPlansRepository],
  exports: [SubscriptionPlansService, SubscriptionPlansRepository],
})
export class SubscriptionPlansModule {}
