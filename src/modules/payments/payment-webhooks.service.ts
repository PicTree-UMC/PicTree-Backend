import { Injectable, Logger } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code';
import { TossPaymentWebhookRequestDto } from './dto/toss-payment-webhook-request.dto';
import {
  PaymentProvider,
  PaymentStatus,
  TossPaymentWebhookEvent,
} from './payments.constant';
import { PaymentsRepository } from './payments.repository';
import {
  PaymentRecord,
  SynchronizePaymentFromWebhookData,
} from './payments.types';
import { TossPaymentResultUnknownError } from './toss-payments.exception';
import { TossPaymentsService } from './toss-payments.service';
import { TossPaymentConfirmResult } from './toss-payments.types';

type TossPaymentWebhookData = {
  paymentKey: string;
  orderId: string;
  status: string;
};

@Injectable()
export class PaymentWebhooksService {
  private readonly logger = new Logger(PaymentWebhooksService.name);

  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly tossPaymentsService: TossPaymentsService,
  ) {}

  handleTossPaymentWebhook = async (
    request: TossPaymentWebhookRequestDto,
    transmissionId?: string,
  ): Promise<void> => {
    const logContext = {
      transmissionId: transmissionId ?? null,
      eventType: request.eventType,
    };

    if (request.eventType !== TossPaymentWebhookEvent.PAYMENT_STATUS_CHANGED) {
      this.logger.log('지원하지 않는 토스 웹훅을 무시합니다.', logContext);
      return;
    }

    const webhookPayment = this.parsePaymentWebhookData(request.data);
    const payment = await this.paymentsRepository.findPaymentByOrderId(
      webhookPayment.orderId,
    );

    if (!payment || payment.paymentProvider !== PaymentProvider.TOSS) {
      this.logger.warn('내부 결제를 찾을 수 없어 웹훅을 무시합니다.', {
        ...logContext,
        orderId: webhookPayment.orderId,
      });
      return;
    }

    const tossPayment = await this.getVerifiedTossPayment(webhookPayment);

    if (
      tossPayment.totalAmount !== payment.amount ||
      (payment.providerPaymentId &&
        payment.providerPaymentId !== tossPayment.paymentKey)
    ) {
      throw new AppException(ErrorCode.PAYMENT_WEBHOOK_PROCESSING_FAILED);
    }

    const synchronizedPayment =
      await this.paymentsRepository.synchronizePaymentFromWebhook(
        this.toSynchronizationData(payment, tossPayment, request.createdAt),
      );

    if (!synchronizedPayment) {
      throw new AppException(ErrorCode.PAYMENT_WEBHOOK_PROCESSING_FAILED);
    }

    this.logger.log('토스 결제 상태 웹훅을 처리했습니다.', {
      ...logContext,
      paymentId: payment.id.toString(),
      orderId: payment.orderId,
      status: synchronizedPayment.status,
      webhookStatus: webhookPayment.status,
    });
  };

  private parsePaymentWebhookData = (
    data: Record<string, unknown> | undefined,
  ): TossPaymentWebhookData => {
    if (
      !data ||
      typeof data.paymentKey !== 'string' ||
      typeof data.orderId !== 'string' ||
      typeof data.status !== 'string'
    ) {
      throw new AppException(ErrorCode.PAYMENT_WEBHOOK_INVALID);
    }

    return {
      paymentKey: data.paymentKey,
      orderId: data.orderId,
      status: data.status,
    };
  };

  private getVerifiedTossPayment = async (
    webhookPayment: TossPaymentWebhookData,
  ): Promise<TossPaymentConfirmResult> => {
    try {
      const tossPayment =
        await this.tossPaymentsService.getPaymentByOrderIdForWebhook(
          webhookPayment.orderId,
        );

      if (
        tossPayment.orderId !== webhookPayment.orderId ||
        tossPayment.paymentKey !== webhookPayment.paymentKey
      ) {
        throw new TossPaymentResultUnknownError();
      }

      return tossPayment;
    } catch (error) {
      if (this.isPaymentConfigMissingError(error)) {
        throw error;
      }

      throw new AppException(ErrorCode.PAYMENT_WEBHOOK_PROCESSING_FAILED);
    }
  };

  private toSynchronizationData = (
    payment: PaymentRecord,
    tossPayment: TossPaymentConfirmResult,
    webhookCreatedAt: string,
  ): SynchronizePaymentFromWebhookData => {
    const approvedAt = tossPayment.approvedAt
      ? this.parseProviderDate(tossPayment.approvedAt)
      : null;
    const webhookAt = this.parseWebhookDate(webhookCreatedAt);

    switch (tossPayment.status) {
      case PaymentStatus.DONE:
        return this.createSynchronizationData(payment, tossPayment, {
          paidAt: approvedAt,
          failedAt: null,
          canceledAt: null,
        });
      case PaymentStatus.WAITING_FOR_DEPOSIT:
        return this.createSynchronizationData(payment, tossPayment, {
          paidAt: null,
          failedAt: null,
          canceledAt: null,
        });
      case PaymentStatus.FAILED:
        return this.createSynchronizationData(payment, tossPayment, {
          paidAt: null,
          failedAt: payment.failedAt ?? webhookAt,
          canceledAt: null,
        });
      case PaymentStatus.CANCELED:
        return this.createSynchronizationData(payment, tossPayment, {
          paidAt: payment.paidAt ?? approvedAt,
          failedAt: null,
          canceledAt: payment.canceledAt ?? this.getCanceledAt(tossPayment),
        });
      default:
        throw new AppException(ErrorCode.PAYMENT_WEBHOOK_PROCESSING_FAILED);
    }
  };

  private createSynchronizationData = (
    payment: PaymentRecord,
    tossPayment: TossPaymentConfirmResult,
    timestamps: Pick<
      SynchronizePaymentFromWebhookData,
      'paidAt' | 'failedAt' | 'canceledAt'
    >,
  ): SynchronizePaymentFromWebhookData => ({
    paymentId: payment.id,
    providerPaymentId: tossPayment.paymentKey,
    paymentMethod: tossPayment.method ?? payment.paymentMethod,
    status: tossPayment.status,
    ...timestamps,
    receiptUrl: tossPayment.receipt?.url ?? null,
  });

  private getCanceledAt = (tossPayment: TossPaymentConfirmResult): Date => {
    const latestCompletedCancel = tossPayment.cancels
      ?.filter((cancel) => cancel.cancelStatus === PaymentStatus.DONE)
      .at(-1);

    if (!latestCompletedCancel) {
      throw new AppException(ErrorCode.PAYMENT_WEBHOOK_PROCESSING_FAILED);
    }

    return this.parseProviderDate(latestCompletedCancel.canceledAt);
  };

  private parseWebhookDate = (value: string): Date => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new AppException(ErrorCode.PAYMENT_WEBHOOK_INVALID);
    }

    return date;
  };

  private parseProviderDate = (value: string): Date => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new AppException(ErrorCode.PAYMENT_WEBHOOK_PROCESSING_FAILED);
    }

    return date;
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
}
