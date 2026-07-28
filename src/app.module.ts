import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { S3Module } from './common/s3/s3.module';
import { AuthModule } from './modules/auth/auth.module';
import { BillingKeysModule } from './modules/billing-keys/billing-keys.module';
import { BlogDraftsModule } from './modules/blog-drafts/blog-drafts.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { NearbyAlertsModule } from './modules/nearby-alerts/nearby-alerts.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PushSubscriptionsModule } from './modules/push-subscriptions/push-subscriptions.module';
import { RoutesModule } from './modules/routes/routes.module';
import { SubscriptionPlansModule } from './modules/subscription-plans/subscription-plans.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { TermsModule } from './modules/terms/terms.module';
import { TimelinesModule } from './modules/timelines/timelines.module';
import { TreeImagesModule } from './modules/tree-images/tree-images.module';
import { TreesModule } from './modules/trees/trees.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    S3Module,
    AuthModule,
    BlogDraftsModule,
    CalendarModule,
    UsersModule,
    TermsModule,
    SubscriptionPlansModule,
    PaymentsModule,
    PushSubscriptionsModule,
    BillingKeysModule,
    NearbyAlertsModule,
    SubscriptionsModule,
    TreesModule,
    TreeImagesModule,
    RoutesModule,
    TimelinesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
