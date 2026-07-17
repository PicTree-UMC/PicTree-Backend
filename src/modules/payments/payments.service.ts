import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code';
import { ConfirmPaymentRequestDto } from './dto/confirm-payment-request.dto';
import { CreatePaymentOrderRequestDto } from './dto/create-payment-order-request.dto';
import { GetPaymentsQueryDto } from './dto/get-payments-query.dto';
import { PaymentListResponseDto } from './dto/payment-list-response.dto';
import { PaymentOrderResponseDto } from './dto/payment-order-response.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import {
  PaymentOrder,
  PaymentProvider,
  PaymentStatus,
} from './payments.constant';
import { PaymentsRepository } from './payments.repository';
import { PaymentRecord } from './payments.types';
import { TossPaymentsService } from './toss-payments.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly tossPaymentsService: TossPaymentsService,
  ) {}

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

  confirmPayment = async (
    userId: number,
    confirmPaymentRequestDto: ConfirmPaymentRequestDto,
  ): Promise<PaymentResponseDto> => {
    const payment = await this.getPaymentByOrderIdOrThrow(
      confirmPaymentRequestDto.orderId,
    );

    this.validatePaymentOwner(payment, userId);
    this.validateReadyPayment(payment);
    this.validatePaymentAmount(payment, confirmPaymentRequestDto.amount);

    const tossPayment = await this.confirmTossPaymentOrFail(
      payment,
      confirmPaymentRequestDto,
    );
    const paidAt = tossPayment.approvedAt
      ? new Date(tossPayment.approvedAt)
      : new Date();
    const completedPayment = await this.paymentsRepository.completePayment({
      paymentId: payment.id,
      providerPaymentId: tossPayment.paymentKey,
      paymentMethod: tossPayment.method,
      status: tossPayment.status,
      paidAt,
      receiptUrl: tossPayment.receipt?.url ?? null,
    });

    return this.toPaymentResponseDto(completedPayment);
  };

  getMyPayments = async (
    userId: number,
    getPaymentsQueryDto: GetPaymentsQueryDto,
  ): Promise<PaymentListResponseDto> => {
    const page = getPaymentsQueryDto.page ?? 1;
    const size = getPaymentsQueryDto.size ?? 20;
    const [payments, total] =
      await this.paymentsRepository.findPaymentsByUserId(
        userId,
        page,
        size,
        getPaymentsQueryDto.status,
      );

    return {
      items: payments.map(this.toPaymentResponseDto),
      page,
      size,
      total,
      totalPages: Math.ceil(total / size),
    };
  };

  getMyPayment = async (
    userId: number,
    paymentId: number,
  ): Promise<PaymentResponseDto> => {
    const payment = await this.paymentsRepository.findPaymentByIdAndUserId(
      paymentId,
      userId,
    );

    if (!payment) {
      throw new AppException(ErrorCode.PAYMENT_NOT_FOUND);
    }

    return this.toPaymentResponseDto(payment);
  };

  private confirmTossPaymentOrFail = async (
    payment: PaymentRecord,
    confirmPaymentRequestDto: ConfirmPaymentRequestDto,
  ) => {
    try {
      return await this.tossPaymentsService.confirmPayment(
        confirmPaymentRequestDto,
      );
    } catch (error) {
      if (this.isPaymentConfigMissingError(error)) {
        throw error;
      }

      await this.paymentsRepository.failPayment(
        payment.id,
        confirmPaymentRequestDto.paymentKey,
        new Date(),
      );

      if (error instanceof AppException) {
        throw error;
      }

      throw new AppException(ErrorCode.PAYMENT_PROVIDER_REQUEST_FAILED);
    }
  };

  private isPaymentConfigMissingError = (error: unknown): boolean => {
    if (!(error instanceof AppException)) {
      return false;
    }

    const response = error.getResponse();

    return (
      typeof response === 'object' &&
      response !== null &&
      'code' in response &&
      response.code === ErrorCode.PAYMENT_CONFIG_MISSING.code
    );
  };

  private getPaymentByOrderIdOrThrow = async (
    orderId: string,
  ): Promise<PaymentRecord> => {
    const payment = await this.paymentsRepository.findPaymentByOrderId(orderId);

    if (!payment) {
      throw new AppException(ErrorCode.PAYMENT_ORDER_NOT_FOUND);
    }

    return payment;
  };

  private validatePaymentOwner = (
    payment: PaymentRecord,
    userId: number,
  ): void => {
    if (payment.userId !== BigInt(userId)) {
      throw new AppException(ErrorCode.PAYMENT_ORDER_NOT_FOUND);
    }
  };

  private validateReadyPayment = (payment: PaymentRecord): void => {
    if (payment.status !== PaymentStatus.READY) {
      throw new AppException(ErrorCode.PAYMENT_INVALID_STATUS);
    }
  };

  private validatePaymentAmount = (
    payment: PaymentRecord,
    amount: number,
  ): void => {
    if (payment.amount !== amount) {
      throw new AppException(ErrorCode.PAYMENT_AMOUNT_MISMATCH);
    }
  };

  private toPaymentResponseDto = (
    payment: PaymentRecord,
  ): PaymentResponseDto => ({
    paymentId: Number(payment.id),
    orderId: payment.orderId,
    orderName: payment.orderName,
    amount: payment.amount,
    status: payment.status,
    paymentMethod: payment.paymentMethod,
    providerPaymentId: payment.providerPaymentId,
    receiptUrl: payment.receipt?.receiptUrl ?? null,
    paidAt: payment.paidAt,
    createdAt: payment.createdAt,
  });

  private createOrderId = (userId: number): string => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 10);

    return `${PaymentOrder.ORDER_ID_PREFIX}_${userId}_${timestamp}_${random}`;
  };

  private createCustomerKey = (userId: number): string => {
    return `${PaymentOrder.CUSTOMER_KEY_PREFIX}_${userId}`;
  };
}
