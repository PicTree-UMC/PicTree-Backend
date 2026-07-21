import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code';
import { ConfirmPaymentRequestDto } from './dto/confirm-payment-request.dto';
import { PaymentStatus, PaymentStatusType } from './payments.constant';
import {
  TossPaymentRejectedError,
  TossPaymentResultUnknownError,
} from './toss-payments.exception';
import {
  TossBillingPaymentRequest,
  TossPaymentConfirmResult,
  TossPaymentResponse,
} from './toss-payments.types';

const TOSS_PAYMENTS_BASE_URL = 'https://api.tosspayments.com';
const TOSS_PAYMENTS_CONFIRM_PATH = '/v1/payments/confirm';
const TOSS_PAYMENTS_REQUEST_TIMEOUT_MS = 60_000;

@Injectable()
export class TossPaymentsService {
  constructor(private readonly configService: ConfigService) {}

  confirmPayment = async (
    confirmPaymentRequestDto: ConfirmPaymentRequestDto,
  ): Promise<TossPaymentConfirmResult> => {
    const response = await this.request(
      `${this.getBaseUrl()}${TOSS_PAYMENTS_CONFIRM_PATH}`,
      {
        method: 'POST',
        headers: {
          Authorization: this.createAuthorizationHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(confirmPaymentRequestDto),
      },
    );

    if (!response.ok) {
      const providerErrorCode = await this.getProviderErrorCode(response);

      if (this.isExplicitRejection(response.status, providerErrorCode)) {
        throw new TossPaymentRejectedError();
      }

      throw new TossPaymentResultUnknownError();
    }

    return this.parsePaymentResponse(response);
  };

  approveBillingPayment = async (
    billingKey: string,
    billingPaymentRequest: TossBillingPaymentRequest,
  ): Promise<TossPaymentConfirmResult> => {
    const response = await this.request(
      `${this.getBaseUrl()}/v1/billing/${encodeURIComponent(billingKey)}`,
      {
        method: 'POST',
        headers: {
          Authorization: this.createAuthorizationHeader(),
          'Content-Type': 'application/json',
          'Idempotency-Key': billingPaymentRequest.orderId,
        },
        body: JSON.stringify(billingPaymentRequest),
      },
    );

    if (!response.ok) {
      const providerErrorCode = await this.getProviderErrorCode(response);

      if (this.isExplicitRejection(response.status, providerErrorCode)) {
        throw new TossPaymentRejectedError();
      }

      throw new TossPaymentResultUnknownError();
    }

    return this.parsePaymentResponse(response);
  };

  cancelPayment = async (
    paymentKey: string,
    cancelReason: string,
    idempotencyKey: string,
  ): Promise<TossPaymentConfirmResult> => {
    const response = await this.request(
      `${this.getBaseUrl()}/v1/payments/${encodeURIComponent(paymentKey)}/cancel`,
      {
        method: 'POST',
        headers: {
          Authorization: this.createAuthorizationHeader(),
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({ cancelReason }),
      },
    );

    if (!response.ok) {
      const providerErrorCode = await this.getProviderErrorCode(response);

      if (this.isExplicitRejection(response.status, providerErrorCode)) {
        throw new TossPaymentRejectedError();
      }

      throw new TossPaymentResultUnknownError();
    }

    return this.parsePaymentResponse(response);
  };

  getPaymentForReconciliation = async (
    orderId: string,
    paymentKey: string,
  ): Promise<TossPaymentConfirmResult> => {
    const orderResponse = await this.request(
      `${this.getBaseUrl()}/v1/payments/orders/${encodeURIComponent(orderId)}`,
      {
        method: 'GET',
        headers: {
          Authorization: this.createAuthorizationHeader(),
        },
      },
    );

    if (orderResponse.ok) {
      return this.parsePaymentResponse(orderResponse);
    }

    if (orderResponse.status !== 404) {
      throw new TossPaymentResultUnknownError();
    }

    const paymentKeyResponse = await this.request(
      `${this.getBaseUrl()}/v1/payments/${encodeURIComponent(paymentKey)}`,
      {
        method: 'GET',
        headers: {
          Authorization: this.createAuthorizationHeader(),
        },
      },
    );

    if (!paymentKeyResponse.ok) {
      throw new TossPaymentResultUnknownError();
    }

    return this.parsePaymentResponse(paymentKeyResponse);
  };

  getPaymentByOrderIdForReconciliation = async (
    orderId: string,
  ): Promise<TossPaymentConfirmResult> => {
    const response = await this.request(
      `${this.getBaseUrl()}/v1/payments/orders/${encodeURIComponent(orderId)}`,
      {
        method: 'GET',
        headers: {
          Authorization: this.createAuthorizationHeader(),
        },
      },
    );

    if (!response.ok) {
      throw new TossPaymentResultUnknownError();
    }

    return this.parsePaymentResponse(response);
  };

  private createAuthorizationHeader = (): string => {
    const secretKey = this.configService.get<string>(
      'TOSS_PAYMENTS_SECRET_KEY',
    );

    if (!secretKey) {
      throw new AppException(ErrorCode.PAYMENT_CONFIG_MISSING);
    }

    return `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;
  };

  private getBaseUrl = (): string => {
    return (
      this.configService.get<string>('TOSS_PAYMENTS_BASE_URL') ??
      TOSS_PAYMENTS_BASE_URL
    ).replace(/\/$/, '');
  };

  private request = async (
    url: string,
    init: RequestInit,
  ): Promise<Response> => {
    try {
      return await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(TOSS_PAYMENTS_REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new TossPaymentResultUnknownError();
    }
  };

  private parsePaymentResponse = async (
    response: Response,
  ): Promise<TossPaymentConfirmResult> => {
    let responseBody: unknown;

    try {
      responseBody = await response.json();
    } catch {
      throw new TossPaymentResultUnknownError();
    }

    if (!this.isTossPaymentResponse(responseBody)) {
      throw new TossPaymentResultUnknownError();
    }

    return this.toConfirmResult(responseBody);
  };

  private getProviderErrorCode = async (
    response: Response,
  ): Promise<string | null> => {
    try {
      const responseBody: unknown = await response.json();

      if (!responseBody || typeof responseBody !== 'object') {
        return null;
      }

      const providerError = responseBody as Record<string, unknown>;

      return typeof providerError.code === 'string' ? providerError.code : null;
    } catch {
      return null;
    }
  };

  private isExplicitRejection = (
    status: number,
    providerErrorCode: string | null,
  ): boolean => {
    const uncertainStatuses = [401, 403, 408, 409, 429];

    return (
      status >= 400 &&
      status < 500 &&
      !uncertainStatuses.includes(status) &&
      !providerErrorCode?.startsWith('ALREADY_')
    );
  };

  private isTossPaymentResponse = (
    responseBody: unknown,
  ): responseBody is TossPaymentResponse => {
    if (!responseBody || typeof responseBody !== 'object') {
      return false;
    }

    const payment = responseBody as Record<string, unknown>;

    return (
      typeof payment.paymentKey === 'string' &&
      typeof payment.orderId === 'string' &&
      typeof payment.status === 'string' &&
      (typeof payment.method === 'string' || payment.method === null) &&
      (typeof payment.approvedAt === 'string' || payment.approvedAt === null) &&
      (payment.receipt === null ||
        (typeof payment.receipt === 'object' && payment.receipt !== null)) &&
      this.isTossPaymentCancels(payment.cancels)
    );
  };

  private isTossPaymentCancels = (cancels: unknown): boolean => {
    if (cancels === undefined || cancels === null) {
      return true;
    }

    if (!Array.isArray(cancels)) {
      return false;
    }

    return cancels.every((cancel: unknown) => {
      if (!cancel || typeof cancel !== 'object') {
        return false;
      }

      const cancelRecord = cancel as Record<string, unknown>;

      return (
        typeof cancelRecord.cancelAmount === 'number' &&
        typeof cancelRecord.canceledAt === 'string' &&
        typeof cancelRecord.cancelStatus === 'string'
      );
    });
  };

  private toConfirmResult = (
    tossPayment: TossPaymentResponse,
  ): TossPaymentConfirmResult => {
    const status = this.mapPaymentStatus(tossPayment.status);

    if (status === PaymentStatus.DONE && !tossPayment.approvedAt) {
      throw new TossPaymentResultUnknownError();
    }

    return {
      ...tossPayment,
      status,
    };
  };

  private mapPaymentStatus = (providerStatus: string): PaymentStatusType => {
    switch (providerStatus) {
      case 'DONE':
        return PaymentStatus.DONE;
      case 'WAITING_FOR_DEPOSIT':
        return PaymentStatus.WAITING_FOR_DEPOSIT;
      case 'CANCELED':
      case 'PARTIAL_CANCELED':
        return PaymentStatus.CANCELED;
      case 'ABORTED':
      case 'EXPIRED':
        return PaymentStatus.FAILED;
      default:
        throw new TossPaymentResultUnknownError();
    }
  };
}
