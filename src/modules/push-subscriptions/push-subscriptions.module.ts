import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PushSubscriptionsController } from './push-subscriptions.controller';
import { PushSubscriptionsRepository } from './push-subscriptions.repository';
import { PushSubscriptionsService } from './push-subscriptions.service';

@Module({
  imports: [AuthModule],
  controllers: [PushSubscriptionsController],
  providers: [PushSubscriptionsService, PushSubscriptionsRepository],
  exports: [PushSubscriptionsRepository],
})
export class PushSubscriptionsModule {}
