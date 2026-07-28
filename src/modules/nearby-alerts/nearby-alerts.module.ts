import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PushSubscriptionsModule } from '../push-subscriptions/push-subscriptions.module';
import { TreesModule } from '../trees/trees.module';
import { NearbyAlertsController } from './nearby-alerts.controller';
import { NearbyAlertsRepository } from './nearby-alerts.repository';
import { NearbyAlertsService } from './nearby-alerts.service';
import { WebPushService } from './web-push.service';

@Module({
  imports: [AuthModule, TreesModule, PushSubscriptionsModule],
  controllers: [NearbyAlertsController],
  providers: [NearbyAlertsService, NearbyAlertsRepository, WebPushService],
})
export class NearbyAlertsModule {}
