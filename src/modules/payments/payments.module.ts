import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PaymentOrdersController } from './payment-orders.controller';
import { PaymentsController } from './payments.controller';
import { PaymentsRepository } from './payments.repository';
import { PaymentsService } from './payments.service';
import { TossPaymentsService } from './toss-payments.service';

@Module({
  imports: [AuthModule],
  controllers: [PaymentOrdersController, PaymentsController],
  providers: [PaymentsService, PaymentsRepository, TossPaymentsService],
  exports: [TossPaymentsService],
})
export class PaymentsModule {}
