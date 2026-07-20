import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code';
import {
  BILLING_CUSTOMER_KEY_PREFIX,
  BillingKeyProvider,
  BillingKeyStatus,
} from './billing-keys.constant';
import { BillingKeysRepository } from './billing-keys.repository';
import { BillingKeyRecord } from './billing-keys.types';
import { BillingCustomerKeyResponseDto } from './dto/billing-customer-key-response.dto';
import { BillingKeyResponseDto } from './dto/billing-key-response.dto';
import { CreateBillingKeyRequestDto } from './dto/create-billing-key-request.dto';
import { DeactivateBillingKeyResponseDto } from './dto/deactivate-billing-key-response.dto';
import {
  TossBillingRejectedError,
  TossBillingResultUnknownError,
} from './toss-billing.exception';
import { TossBillingService } from './toss-billing.service';
import { TossBillingKeyResponse } from './toss-billing.types';

@Injectable()
export class BillingKeysService {
  constructor(
    private readonly billingKeysRepository: BillingKeysRepository,
    private readonly tossBillingService: TossBillingService,
    private readonly configService: ConfigService,
  ) {}

  getCustomerKey = (userId: number): BillingCustomerKeyResponseDto => {
    return {
      customerKey: this.createCustomerKey(userId),
    };
  };

  createBillingKey = async (
    userId: number,
    createBillingKeyRequestDto: CreateBillingKeyRequestDto,
  ): Promise<BillingKeyResponseDto> => {
    const expectedCustomerKey = this.createCustomerKey(userId);

    if (
      !this.areEqualKeys(
        createBillingKeyRequestDto.customerKey,
        expectedCustomerKey,
      )
    ) {
      throw new AppException(ErrorCode.BILLING_KEY_INVALID_CUSTOMER_KEY);
    }

    const tossBillingKey = await this.issueTossBillingKey(
      createBillingKeyRequestDto.authKey,
      expectedCustomerKey,
    );

    this.validateTossBillingKey(tossBillingKey, expectedCustomerKey);

    const billingKeyResult =
      await this.billingKeysRepository.findOrCreateActiveBillingKey({
        userId,
        paymentProvider: BillingKeyProvider.TOSS,
        billingKey: tossBillingKey.billingKey,
        customerKey: expectedCustomerKey,
        cardCompany: tossBillingKey.card.issuerCode,
        cardNumberMasked: tossBillingKey.card.number,
        status: BillingKeyStatus.ACTIVE,
        issuedAt: new Date(tossBillingKey.authenticatedAt),
      });

    if (!billingKeyResult.created) {
      await this.cleanupDuplicateTossBillingKey(tossBillingKey.billingKey);
    }

    return this.toBillingKeyResponseDto(billingKeyResult.billingKey);
  };

  getMyBillingKeys = async (
    userId: number,
  ): Promise<BillingKeyResponseDto[]> => {
    const billingKeys =
      await this.billingKeysRepository.findActiveBillingKeysByUserId(userId);

    return billingKeys.map(this.toBillingKeyResponseDto);
  };

  deactivateBillingKey = async (
    userId: number,
    billingKeyId: number,
  ): Promise<DeactivateBillingKeyResponseDto> => {
    const billingKey =
      await this.billingKeysRepository.findBillingKeyByIdAndUserId(
        billingKeyId,
        userId,
      );

    if (!billingKey) {
      throw new AppException(ErrorCode.BILLING_KEY_NOT_FOUND);
    }

    if (
      billingKey.status === BillingKeyStatus.DEACTIVATED &&
      billingKey.deactivatedAt
    ) {
      return this.toDeactivateBillingKeyResponseDto(
        billingKey,
        billingKey.deactivatedAt,
      );
    }

    await this.deleteTossBillingKey(billingKey.billingKey);

    const deactivatedBillingKey =
      await this.billingKeysRepository.deactivateBillingKey(
        billingKey.id,
        new Date(),
      );

    if (!deactivatedBillingKey.deactivatedAt) {
      throw new AppException(ErrorCode.INTERNAL_SERVER_ERROR);
    }

    return this.toDeactivateBillingKeyResponseDto(
      deactivatedBillingKey,
      deactivatedBillingKey.deactivatedAt,
    );
  };

  private issueTossBillingKey = async (
    authKey: string,
    customerKey: string,
  ): Promise<TossBillingKeyResponse> => {
    try {
      return await this.tossBillingService.issueBillingKey(
        authKey,
        customerKey,
      );
    } catch (error) {
      return this.handleTossBillingError(error);
    }
  };

  private deleteTossBillingKey = async (billingKey: string): Promise<void> => {
    try {
      await this.tossBillingService.deleteBillingKey(billingKey);
    } catch (error) {
      this.handleTossBillingError(error);
    }
  };

  private cleanupDuplicateTossBillingKey = async (
    billingKey: string,
  ): Promise<void> => {
    try {
      await this.tossBillingService.deleteBillingKey(billingKey);
    } catch (error) {
      if (
        error instanceof TossBillingRejectedError ||
        error instanceof TossBillingResultUnknownError
      ) {
        return;
      }

      throw error;
    }
  };

  private handleTossBillingError = (error: unknown): never => {
    if (error instanceof AppException) {
      throw error;
    }

    if (
      error instanceof TossBillingRejectedError ||
      error instanceof TossBillingResultUnknownError
    ) {
      throw new AppException(ErrorCode.BILLING_KEY_PROVIDER_REQUEST_FAILED);
    }

    throw error;
  };

  private createCustomerKey = (userId: number): string => {
    const secret = this.configService.get<string>(
      'TOSS_BILLING_CUSTOMER_KEY_SECRET',
    );

    if (!secret) {
      throw new AppException(ErrorCode.BILLING_KEY_CONFIG_MISSING);
    }

    const digest = createHmac('sha256', secret)
      .update(`user:${userId}`)
      .digest('hex');

    return `${BILLING_CUSTOMER_KEY_PREFIX}${digest}`;
  };

  private validateTossBillingKey = (
    tossBillingKey: TossBillingKeyResponse,
    expectedCustomerKey: string,
  ): void => {
    const authenticatedAt = new Date(tossBillingKey.authenticatedAt);

    if (
      !this.areEqualKeys(tossBillingKey.customerKey, expectedCustomerKey) ||
      Number.isNaN(authenticatedAt.getTime())
    ) {
      throw new AppException(ErrorCode.BILLING_KEY_PROVIDER_REQUEST_FAILED);
    }
  };

  private areEqualKeys = (left: string, right: string): boolean => {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    return (
      leftBuffer.length === rightBuffer.length &&
      timingSafeEqual(leftBuffer, rightBuffer)
    );
  };

  private toBillingKeyResponseDto = (
    billingKey: BillingKeyRecord,
  ): BillingKeyResponseDto => ({
    billingKeyId: Number(billingKey.id),
    paymentProvider: billingKey.paymentProvider,
    cardCompany: billingKey.cardCompany,
    cardNumberMasked: billingKey.cardNumberMasked,
    status: billingKey.status,
    issuedAt: billingKey.issuedAt,
  });

  private toDeactivateBillingKeyResponseDto = (
    billingKey: BillingKeyRecord,
    deactivatedAt: Date,
  ): DeactivateBillingKeyResponseDto => ({
    billingKeyId: Number(billingKey.id),
    status: billingKey.status,
    deactivatedAt,
  });
}
