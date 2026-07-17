import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code';
import { CreatePaymentOrderRequestDto } from './dto/create-payment-order-request.dto';
import { PaymentOrderResponseDto } from './dto/payment-order-response.dto';
import {
  PaymentOrder,
  PaymentProvider,
  PaymentStatus,
} from './payments.constant';
import { PaymentsRepository } from './payments.repository';

@Injectable()
export class PaymentsService {
  constructor(private readonly paymentsRepository: PaymentsRepository) {}

  createPaymentOrder = async (
    userId: number,
    createPaymentOrderRequestDto: CreatePaymentOrderRequestDto,
  ): Promise<PaymentOrderResponseDto> => {
    const subscriptionPlan =
      await this.paymentsRepository.findSubscriptionPlanById(
        createPaymentOrderRequestDto.subscriptionPlanId,
      );

    if (!subscriptionPlan || !subscriptionPlan.isActive) {
      throw new AppException(ErrorCode.PAYMENT_SUBSCRIPTION_PLAN_NOT_FOUND);
    }

    const orderId = this.createOrderId(userId);
    const orderName = `${subscriptionPlan.name} 플랜`;

    await this.paymentsRepository.createPayment({
      userId,
      orderId,
      orderName,
      amount: subscriptionPlan.price,
      paymentProvider: PaymentProvider.TOSS,
      status: PaymentStatus.READY,
    });

    return {
      orderId,
      orderName,
      amount: subscriptionPlan.price,
      customerKey: this.createCustomerKey(userId),
    };
  };

  private createOrderId = (userId: number): string => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 10);

    return `${PaymentOrder.ORDER_ID_PREFIX}_${userId}_${timestamp}_${random}`;
  };

  private createCustomerKey = (userId: number): string => {
    return `${PaymentOrder.CUSTOMER_KEY_PREFIX}_${userId}`;
  };
}
