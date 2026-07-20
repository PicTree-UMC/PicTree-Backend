import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code';
import {
  TossBillingRejectedError,
  TossBillingResultUnknownError,
} from './toss-billing.exception';
import { TossBillingKeyResponse } from './toss-billing.types';

const TOSS_PAYMENTS_BASE_URL = 'https://api.tosspayments.com';
const TOSS_BILLING_ISSUE_PATH = '/v1/billing/authorizations/issue';
const TOSS_BILLING_REQUEST_TIMEOUT_MS = 60_000;

@Injectable()
export class TossBillingService {
  constructor(private readonly configService: ConfigService) {}

  issueBillingKey = async (
    authKey: string,
    customerKey: string,
  ): Promise<TossBillingKeyResponse> => {
    const response = await this.request(
      `${this.getBaseUrl()}${TOSS_BILLING_ISSUE_PATH}`,
      {
        method: 'POST',
        headers: {
          Authorization: this.createAuthorizationHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ authKey, customerKey }),
      },
    );

    if (!response.ok) {
      this.throwProviderError(response);
    }

    return this.parseBillingKeyResponse(response);
  };

  deleteBillingKey = async (billingKey: string): Promise<void> => {
    const response = await this.request(
      `${this.getBaseUrl()}/v1/billing/${encodeURIComponent(billingKey)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: this.createAuthorizationHeader(),
        },
      },
    );

    if (response.ok || response.status === 404) {
      return;
    }

    const providerErrorCode = await this.getProviderErrorCode(response);

    if (providerErrorCode?.startsWith('ALREADY_')) {
      return;
    }

    if (this.isExplicitRejection(response.status)) {
      throw new TossBillingRejectedError();
    }

    throw new TossBillingResultUnknownError();
  };

  private createAuthorizationHeader = (): string => {
    const secretKey = this.configService.get<string>(
      'TOSS_PAYMENTS_SECRET_KEY',
    );

    if (!secretKey) {
      throw new AppException(ErrorCode.BILLING_KEY_CONFIG_MISSING);
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
        signal: AbortSignal.timeout(TOSS_BILLING_REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new TossBillingResultUnknownError();
    }
  };

  private throwProviderError = (response: Response): never => {
    if (this.isExplicitRejection(response.status)) {
      throw new TossBillingRejectedError();
    }

    throw new TossBillingResultUnknownError();
  };

  private isExplicitRejection = (status: number): boolean => {
    return status >= 400 && status < 500 && ![408, 409, 429].includes(status);
  };

  private parseBillingKeyResponse = async (
    response: Response,
  ): Promise<TossBillingKeyResponse> => {
    let responseBody: unknown;

    try {
      responseBody = await response.json();
    } catch {
      throw new TossBillingResultUnknownError();
    }

    if (!this.isTossBillingKeyResponse(responseBody)) {
      throw new TossBillingResultUnknownError();
    }

    return responseBody;
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

  private isTossBillingKeyResponse = (
    responseBody: unknown,
  ): responseBody is TossBillingKeyResponse => {
    if (!responseBody || typeof responseBody !== 'object') {
      return false;
    }

    const billing = responseBody as Record<string, unknown>;

    if (!billing.card || typeof billing.card !== 'object') {
      return false;
    }

    const card = billing.card as Record<string, unknown>;

    return (
      typeof billing.billingKey === 'string' &&
      typeof billing.customerKey === 'string' &&
      typeof billing.authenticatedAt === 'string' &&
      typeof billing.method === 'string' &&
      (typeof card.issuerCode === 'string' || card.issuerCode === null) &&
      typeof card.number === 'string'
    );
  };
}
