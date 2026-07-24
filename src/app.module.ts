import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { BillingKeysModule } from './modules/billing-keys/billing-keys.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { RoutesModule } from './modules/routes/routes.module';
import { SubscriptionPlansModule } from './modules/subscription-plans/subscription-plans.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { TermsModule } from './modules/terms/terms.module';
import { TimelinesModule } from './modules/timelines/timelines.module';
import { TreesModule } from './modules/trees/trees.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    TermsModule,
    SubscriptionPlansModule,
    PaymentsModule,
    BillingKeysModule,
    SubscriptionsModule,
    TreesModule,
    RoutesModule,
    TimelinesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
