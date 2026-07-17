import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SubscriptionPlansModule } from './modules/subscription-plans/subscription-plans.module';
import { TermsModule } from './modules/terms/terms.module';
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
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
