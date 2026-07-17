import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code';
import { ConfirmPaymentRequestDto } from './dto/confirm-payment-request.dto';
import { PaymentStatus, PaymentStatusType } from './payments.constant';
import {
  TossPaymentConfirmResult,
  TossPaymentResponse,
} from './toss-payments.types';

const TOSS_PAYMENTS_BASE_URL = 'https://api.tosspayments.com';
const TOSS_PAYMENTS_CONFIRM_PATH = '/v1/payments/confirm';
const TOSS_PAYMENTS_REQUEST_TIMEOUT_MS = 5000;

@Injectable()
export class TossPaymentsService {
  constructor(private readonly configService: ConfigService) {}

  confirmPayment = async (
    confirmPaymentRequestDto: ConfirmPaymentRequestDto,
  ): Promise<TossPaymentConfirmResult> => {
    const response = await fetch(
      `${this.getBaseUrl()}${TOSS_PAYMENTS_CONFIRM_PATH}`,
      {
        method: 'POST',
        headers: {
          Authorization: this.createAuthorizationHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(confirmPaymentRequestDto),
        signal: AbortSignal.timeout(TOSS_PAYMENTS_REQUEST_TIMEOUT_MS),
      },
    );

    const responseBody: unknown = await response.json();

    if (!response.ok || !this.isTossPaymentResponse(responseBody)) {
      throw new AppException(ErrorCode.PAYMENT_PROVIDER_REQUEST_FAILED);
    }

    return this.toConfirmResult(responseBody);
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
        (typeof payment.receipt === 'object' && payment.receipt !== null))
    );
  };

  private toConfirmResult = (
    tossPayment: TossPaymentResponse,
  ): TossPaymentConfirmResult => {
    const status = this.mapPaymentStatus(tossPayment.status);

    if (status === PaymentStatus.DONE && !tossPayment.approvedAt) {
      throw new AppException(ErrorCode.PAYMENT_PROVIDER_REQUEST_FAILED);
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
        throw new AppException(ErrorCode.PAYMENT_PROVIDER_REQUEST_FAILED);
    }
  };
}
