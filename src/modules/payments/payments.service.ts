import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code';
import { CancelPaymentRequestDto } from './dto/cancel-payment-request.dto';
import { CancelPaymentResponseDto } from './dto/cancel-payment-response.dto';
import { ConfirmPaymentRequestDto } from './dto/confirm-payment-request.dto';
import { CreatePaymentOrderRequestDto } from './dto/create-payment-order-request.dto';
import { GetPaymentsQueryDto } from './dto/get-payments-query.dto';
import { PaymentListResponseDto } from './dto/payment-list-response.dto';
import { PaymentOrderResponseDto } from './dto/payment-order-response.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import {
  PaymentIdempotencyKey,
  PaymentOrder,
  PaymentProvider,
  PaymentStatus,
} from './payments.constant';
import { PaymentsRepository } from './payments.repository';
import { PaymentRecord } from './payments.types';
import {
  TossPaymentRejectedError,
  TossPaymentResultUnknownError,
} from './toss-payments.exception';
import { TossPaymentsService } from './toss-payments.service';
import { TossPaymentConfirmResult } from './toss-payments.types';

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
    const confirmedPayment = await this.saveConfirmedPaymentWithRecovery(
      payment,
      confirmPaymentRequestDto,
      tossPayment,
    );

    return this.toPaymentResponseDto(confirmedPayment);
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

  cancelPayment = async (
    userId: number,
    paymentId: number,
    cancelPaymentRequestDto: CancelPaymentRequestDto,
  ): Promise<CancelPaymentResponseDto> => {
    const payment = await this.paymentsRepository.findPaymentByIdAndUserId(
      paymentId,
      userId,
    );

    if (!payment) {
      throw new AppException(ErrorCode.PAYMENT_NOT_FOUND);
    }

    if (payment.status === PaymentStatus.CANCELED && payment.canceledAt) {
      return this.toCancelPaymentResponseDto(payment);
    }

    this.validateCancelablePayment(payment);

    const cancellation = await this.cancelTossPaymentOrReconcile(
      payment,
      cancelPaymentRequestDto.cancelReason,
    );
    const canceledPayment = await this.saveCanceledPaymentWithRecovery(
      payment,
      cancellation.canceledAt,
    );

    return this.toCancelPaymentResponseDto(canceledPayment);
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

      if (error instanceof TossPaymentRejectedError) {
        await this.paymentsRepository.failPayment(
          payment.id,
          confirmPaymentRequestDto.paymentKey,
          new Date(),
        );

        throw new AppException(ErrorCode.PAYMENT_PROVIDER_REQUEST_FAILED);
      }

      if (error instanceof TossPaymentResultUnknownError) {
        return this.reconcileTossPayment(
          confirmPaymentRequestDto.orderId,
          confirmPaymentRequestDto.paymentKey,
        );
      }

      throw error;
    }
  };

  private saveConfirmedPaymentWithRecovery = async (
    payment: PaymentRecord,
    confirmPaymentRequestDto: ConfirmPaymentRequestDto,
    tossPayment: TossPaymentConfirmResult,
  ): Promise<PaymentRecord> => {
    try {
      return await this.saveConfirmedPayment(payment, tossPayment);
    } catch (saveError) {
      const reconciledPayment = await this.reconcileTossPayment(
        confirmPaymentRequestDto.orderId,
        confirmPaymentRequestDto.paymentKey,
      );

      try {
        return await this.saveConfirmedPayment(payment, reconciledPayment);
      } catch {
        throw saveError;
      }
    }
  };

  private saveConfirmedPayment = (
    payment: PaymentRecord,
    tossPayment: TossPaymentConfirmResult,
  ): Promise<PaymentRecord> => {
    const paidAt =
      tossPayment.status === PaymentStatus.DONE
        ? new Date(tossPayment.approvedAt as string)
        : null;

    return this.paymentsRepository.updatePaymentAfterConfirm({
      paymentId: payment.id,
      providerPaymentId: tossPayment.paymentKey,
      paymentMethod: tossPayment.method,
      status: tossPayment.status,
      paidAt,
      receiptUrl: tossPayment.receipt?.url ?? null,
    });
  };

  private reconcileTossPayment = async (
    orderId: string,
    paymentKey: string,
  ): Promise<TossPaymentConfirmResult> => {
    try {
      const tossPayment =
        await this.tossPaymentsService.getPaymentForReconciliation(
          orderId,
          paymentKey,
        );

      if (
        tossPayment.orderId !== orderId ||
        tossPayment.paymentKey !== paymentKey
      ) {
        throw new TossPaymentResultUnknownError();
      }

      return tossPayment;
    } catch (error) {
      if (this.isPaymentConfigMissingError(error)) {
        throw error;
      }

      throw new AppException(ErrorCode.PAYMENT_PROVIDER_REQUEST_FAILED);
    }
  };

  private cancelTossPaymentOrReconcile = async (
    payment: PaymentRecord,
    cancelReason: string,
  ): Promise<{ canceledAt: Date }> => {
    const paymentKey = payment.providerPaymentId as string;

    try {
      const tossPayment = await this.tossPaymentsService.cancelPayment(
        paymentKey,
        cancelReason,
        this.createCancelIdempotencyKey(payment.id),
      );

      return {
        canceledAt: this.getCanceledAtOrThrow(tossPayment, payment.amount),
      };
    } catch (error) {
      if (this.isPaymentConfigMissingError(error)) {
        throw error;
      }

      if (error instanceof TossPaymentRejectedError) {
        throw new AppException(ErrorCode.PAYMENT_PROVIDER_REQUEST_FAILED);
      }

      if (error instanceof TossPaymentResultUnknownError) {
        return this.reconcileCanceledTossPayment(payment);
      }

      throw error;
    }
  };

  private reconcileCanceledTossPayment = async (
    payment: PaymentRecord,
  ): Promise<{ canceledAt: Date }> => {
    const paymentKey = payment.providerPaymentId as string;
    const tossPayment = await this.reconcileTossPayment(
      payment.orderId,
      paymentKey,
    );

    try {
      return {
        canceledAt: this.getCanceledAtOrThrow(tossPayment, payment.amount),
      };
    } catch {
      throw new AppException(ErrorCode.PAYMENT_PROVIDER_REQUEST_FAILED);
    }
  };

  private saveCanceledPaymentWithRecovery = async (
    payment: PaymentRecord,
    canceledAt: Date,
  ): Promise<PaymentRecord> => {
    try {
      return await this.saveCanceledPayment(payment.id, canceledAt);
    } catch (saveError) {
      const reconciledCancellation =
        await this.reconcileCanceledTossPayment(payment);

      try {
        return await this.saveCanceledPayment(
          payment.id,
          reconciledCancellation.canceledAt,
        );
      } catch {
        throw saveError;
      }
    }
  };

  private saveCanceledPayment = async (
    paymentId: bigint,
    canceledAt: Date,
  ): Promise<PaymentRecord> => {
    const canceledPayment =
      await this.paymentsRepository.updatePaymentAfterCancel(
        paymentId,
        canceledAt,
      );

    if (
      canceledPayment.status !== PaymentStatus.CANCELED ||
      !canceledPayment.canceledAt
    ) {
      throw new AppException(ErrorCode.PAYMENT_CANCEL_NOT_ALLOWED);
    }

    return canceledPayment;
  };

  private getCanceledAtOrThrow = (
    tossPayment: TossPaymentConfirmResult,
    paymentAmount: number,
  ): Date => {
    if (tossPayment.status !== PaymentStatus.CANCELED) {
      throw new TossPaymentResultUnknownError();
    }

    const completedCancels =
      tossPayment.cancels?.filter(
        (cancel) => cancel.cancelStatus === PaymentStatus.DONE,
      ) ?? [];
    const canceledAmount = completedCancels.reduce(
      (total, cancel) => total + cancel.cancelAmount,
      0,
    );
    const latestCancel = completedCancels.at(-1);

    if (!latestCancel || canceledAmount < paymentAmount) {
      throw new TossPaymentResultUnknownError();
    }

    const canceledAt = new Date(latestCancel.canceledAt);

    if (Number.isNaN(canceledAt.getTime())) {
      throw new TossPaymentResultUnknownError();
    }

    return canceledAt;
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

  private validateCancelablePayment = (payment: PaymentRecord): void => {
    if (payment.status !== PaymentStatus.DONE || !payment.providerPaymentId) {
      throw new AppException(ErrorCode.PAYMENT_CANCEL_NOT_ALLOWED);
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

  private toCancelPaymentResponseDto = (
    payment: PaymentRecord,
  ): CancelPaymentResponseDto => ({
    paymentId: Number(payment.id),
    orderId: payment.orderId,
    amount: payment.amount,
    status: payment.status,
    canceledAt: payment.canceledAt as Date,
  });

  private createOrderId = (userId: number): string => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 10);

    return `${PaymentOrder.ORDER_ID_PREFIX}_${userId}_${timestamp}_${random}`;
  };

  private createCustomerKey = (userId: number): string => {
    return `${PaymentOrder.CUSTOMER_KEY_PREFIX}_${userId}`;
  };

  private createCancelIdempotencyKey = (paymentId: bigint): string => {
    return `${PaymentIdempotencyKey.CANCEL_PREFIX}_${paymentId}`;
  };
}
