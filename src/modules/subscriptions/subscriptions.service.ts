import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code';
import { PaymentProvider, PaymentStatus } from '../payments/payments.constant';
import {
  TossPaymentRejectedError,
  TossPaymentResultUnknownError,
} from '../payments/toss-payments.exception';
import { TossPaymentsService } from '../payments/toss-payments.service';
import { TossPaymentConfirmResult } from '../payments/toss-payments.types';
import { ChangeSubscriptionPlanRequestDto } from './dto/change-subscription-plan-request.dto';
import { CreateSubscriptionRequestDto } from './dto/create-subscription-request.dto';
import { SubscriptionResponseDto } from './dto/subscription-response.dto';
import {
  SubscriptionBillingCycle,
  SubscriptionOrder,
  SubscriptionRenewalPolicy,
  SubscriptionStatus,
} from './subscriptions.constant';
import { SubscriptionsRepository } from './subscriptions.repository';
import {
  SubscriptionPaymentRecord,
  PendingPlanChangeUpdateResult,
  SubscriptionPlanRecord,
  SubscriptionRecord,
  SubscriptionRenewalReservation,
  SubscriptionStartReservation,
} from './subscriptions.types';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly tossPaymentsService: TossPaymentsService,
  ) {}

  getMySubscription = async (
    userId: number,
  ): Promise<SubscriptionResponseDto> => {
    const currentSubscription =
      await this.subscriptionsRepository.findCurrentSubscription(userId);
    const now = new Date();

    if (currentSubscription && currentSubscription.expiresAt > now) {
      return this.toSubscriptionResponseDto(currentSubscription);
    }

    const freePlan = await this.subscriptionsRepository.findActiveFreePlan();

    if (!freePlan) {
      throw new AppException(ErrorCode.SUBSCRIPTION_PLAN_NOT_FOUND);
    }

    return this.toFreeSubscriptionResponseDto(freePlan);
  };

  createSubscription = async (
    userId: number,
    request: CreateSubscriptionRequestDto,
  ): Promise<SubscriptionResponseDto> => {
    const reservation =
      await this.subscriptionsRepository.reserveSubscriptionPayment({
        userId,
        subscriptionPlanId: request.subscriptionPlanId,
        billingKeyId: request.billingKeyId,
        orderId: this.createOrderId(userId),
        paymentProvider: PaymentProvider.TOSS,
        paymentStatus: PaymentStatus.READY,
        now: new Date(),
      });

    const payment = this.validateReservation(reservation, request);

    if (reservation.currentSubscription) {
      return this.toSubscriptionResponseDto(reservation.currentSubscription);
    }

    if (!payment) {
      throw new AppException(ErrorCode.INTERNAL_SERVER_ERROR);
    }

    const plan = reservation.plan as SubscriptionPlanRecord;
    const billingKey = reservation.billingKey;
    const user = reservation.user;

    if (!billingKey || !user) {
      throw new AppException(ErrorCode.INTERNAL_SERVER_ERROR);
    }

    const tossPayment = await this.approveTossBillingPayment(
      payment,
      billingKey.billingKey,
      billingKey.customerKey,
      user.email,
      user.nickname,
    );

    const subscription = await this.saveSubscriptionWithRecovery(
      userId,
      payment,
      plan,
      tossPayment,
    );

    return this.toSubscriptionResponseDto(subscription);
  };

  cancelSubscription = async (
    userId: number,
    subscriptionId: number,
  ): Promise<SubscriptionResponseDto> => {
    return this.updateSubscriptionAutoRenewal(userId, subscriptionId, false);
  };

  resumeSubscription = async (
    userId: number,
    subscriptionId: number,
  ): Promise<SubscriptionResponseDto> => {
    return this.updateSubscriptionAutoRenewal(userId, subscriptionId, true);
  };

  schedulePlanChange = async (
    userId: number,
    subscriptionId: number,
    request: ChangeSubscriptionPlanRequestDto,
  ): Promise<SubscriptionResponseDto> => {
    const targetPlan = await this.subscriptionsRepository.findActivePlanById(
      request.subscriptionPlanId,
    );

    if (!targetPlan) {
      throw new AppException(ErrorCode.SUBSCRIPTION_PLAN_NOT_FOUND);
    }

    this.validateSubscribablePlan(targetPlan);

    const result = await this.subscriptionsRepository.updatePendingPlanChange({
      userId,
      subscriptionId,
      pendingPlanId: request.subscriptionPlanId,
      changedAt: new Date(),
    });

    return this.toValidatedPlanChangeResponse(result, true);
  };

  cancelPlanChange = async (
    userId: number,
    subscriptionId: number,
  ): Promise<SubscriptionResponseDto> => {
    const result = await this.subscriptionsRepository.updatePendingPlanChange({
      userId,
      subscriptionId,
      pendingPlanId: null,
      changedAt: new Date(),
    });

    return this.toValidatedPlanChangeResponse(result, false);
  };

  processDueSubscriptionRenewals = async (): Promise<number> => {
    const runStartedAt = new Date();
    let renewedCount = 0;
    let afterSubscriptionId: bigint | undefined;

    while (true) {
      const renewals =
        await this.subscriptionsRepository.findDueSubscriptionRenewals(
          runStartedAt,
          SubscriptionRenewalPolicy.BATCH_SIZE,
          SubscriptionRenewalPolicy.MAX_ATTEMPTS,
          afterSubscriptionId,
        );

      for (const renewal of renewals) {
        try {
          const renewed = await this.processSubscriptionRenewal(
            renewal.userId,
            renewal.id,
            runStartedAt,
          );

          if (renewed) {
            renewedCount += 1;
          }
        } catch (error: unknown) {
          this.logger.error('구독 자동갱신 처리에 실패했습니다.', {
            subscriptionId: renewal.id.toString(),
            error,
          });
        }
      }

      if (renewals.length < SubscriptionRenewalPolicy.BATCH_SIZE) {
        break;
      }

      afterSubscriptionId = renewals[renewals.length - 1].id;
    }

    return renewedCount;
  };

  private updateSubscriptionAutoRenewal = async (
    userId: number,
    subscriptionId: number,
    autoRenew: boolean,
  ): Promise<SubscriptionResponseDto> => {
    const result =
      await this.subscriptionsRepository.updateSubscriptionAutoRenewal({
        userId,
        subscriptionId,
        autoRenew,
        changedAt: new Date(),
      });

    if (!result.subscription) {
      throw new AppException(ErrorCode.SUBSCRIPTION_NOT_FOUND);
    }

    if (!result.isCurrent || result.isExpired) {
      throw new AppException(
        autoRenew
          ? ErrorCode.SUBSCRIPTION_RESUME_NOT_ALLOWED
          : ErrorCode.SUBSCRIPTION_CANCEL_NOT_ALLOWED,
      );
    }

    return this.toSubscriptionResponseDto(result.subscription);
  };

  private toValidatedPlanChangeResponse = (
    result: PendingPlanChangeUpdateResult,
    targetPlanRequired: boolean,
  ): SubscriptionResponseDto => {
    if (!result.subscription) {
      throw new AppException(ErrorCode.SUBSCRIPTION_NOT_FOUND);
    }

    if (targetPlanRequired && !result.targetPlan) {
      throw new AppException(ErrorCode.SUBSCRIPTION_PLAN_NOT_FOUND);
    }

    if (
      !result.isCurrent ||
      result.isExpired ||
      !result.isAutoRenewEnabled ||
      result.isSameCurrentPlan
    ) {
      throw new AppException(ErrorCode.SUBSCRIPTION_PLAN_CHANGE_NOT_ALLOWED);
    }

    return this.toSubscriptionResponseDto(result.subscription);
  };

  private processSubscriptionRenewal = async (
    userId: bigint,
    subscriptionId: bigint,
    now: Date,
  ): Promise<boolean> => {
    const reservation =
      await this.subscriptionsRepository.reserveSubscriptionRenewal(
        userId,
        subscriptionId,
        now,
        SubscriptionRenewalPolicy.MAX_ATTEMPTS,
      );

    if (reservation.status === 'NOT_ELIGIBLE') {
      return false;
    }

    if (reservation.status !== 'READY') {
      await this.recordRenewalFailure(reservation, now);
      return false;
    }

    const { sourceSubscription, user, plan, billingKey, payment } = reservation;

    if (!sourceSubscription || !user || !plan || !billingKey || !payment) {
      throw new AppException(ErrorCode.INTERNAL_SERVER_ERROR);
    }

    const onRejected = () => this.recordRenewalFailure(reservation, new Date());
    const tossPayment =
      payment.status === PaymentStatus.DONE
        ? await this.reconcileTossBillingPayment(
            payment.orderId,
            payment.amount,
          )
        : await this.approveTossBillingPayment(
            payment,
            billingKey.billingKey,
            billingKey.customerKey,
            user.email,
            user.nickname,
            onRejected,
          );

    await this.saveSubscriptionWithRecovery(
      Number(user.id),
      payment,
      plan,
      tossPayment,
    );

    return true;
  };

  private recordRenewalFailure = async (
    reservation: SubscriptionRenewalReservation,
    failedAt: Date,
  ): Promise<void> => {
    if (!reservation.sourceSubscription || !reservation.attemptNumber) {
      return;
    }

    await this.subscriptionsRepository.recordSubscriptionRenewalFailure({
      userId: reservation.sourceSubscription.userId,
      subscriptionId: reservation.sourceSubscription.id,
      attemptNumber: reservation.attemptNumber,
      failedAt,
      retryAt: new Date(
        failedAt.getTime() + SubscriptionRenewalPolicy.RETRY_DELAY_MS,
      ),
      maxAttempts: SubscriptionRenewalPolicy.MAX_ATTEMPTS,
    });
  };

  private validateReservation = (
    reservation: SubscriptionStartReservation,
    request: CreateSubscriptionRequestDto,
  ): SubscriptionPaymentRecord | null => {
    if (!reservation.user) {
      throw new AppException(ErrorCode.USER_NOT_FOUND);
    }

    if (reservation.user.status !== 'ACTIVE') {
      throw new AppException(ErrorCode.USER_UNAVAILABLE);
    }

    if (!reservation.plan) {
      throw new AppException(ErrorCode.SUBSCRIPTION_PLAN_NOT_FOUND);
    }

    this.validateSubscribablePlan(reservation.plan);

    if (!reservation.billingKey) {
      throw new AppException(ErrorCode.SUBSCRIPTION_BILLING_KEY_NOT_FOUND);
    }

    if (reservation.currentSubscription) {
      if (
        Number(reservation.currentSubscription.subscriptionPlanId) ===
        request.subscriptionPlanId
      ) {
        return null;
      }

      throw new AppException(ErrorCode.SUBSCRIPTION_ALREADY_ACTIVE);
    }

    if (reservation.pendingPayment) {
      const isSameRequest =
        Number(reservation.pendingPayment.billingKeyId) ===
          request.billingKeyId &&
        reservation.pendingPayment.amount === reservation.plan.price &&
        reservation.pendingPayment.orderName ===
          `${reservation.plan.name} 플랜 구독`;

      if (!isSameRequest) {
        throw new AppException(ErrorCode.SUBSCRIPTION_PAYMENT_IN_PROGRESS);
      }

      return reservation.pendingPayment;
    }

    if (!reservation.payment) {
      throw new AppException(ErrorCode.INTERNAL_SERVER_ERROR);
    }

    return reservation.payment;
  };

  private validateSubscribablePlan = (plan: SubscriptionPlanRecord): void => {
    const supportedBillingCycles = Object.values(SubscriptionBillingCycle);

    if (
      plan.price <= 0 ||
      !supportedBillingCycles.includes(
        plan.billingCycle as (typeof supportedBillingCycles)[number],
      )
    ) {
      throw new AppException(ErrorCode.SUBSCRIPTION_PLAN_NOT_SUBSCRIBABLE);
    }
  };

  private approveTossBillingPayment = async (
    payment: SubscriptionPaymentRecord,
    billingKey: string,
    customerKey: string,
    customerEmail: string | null,
    customerName: string,
    onRejected?: () => Promise<void>,
  ): Promise<TossPaymentConfirmResult> => {
    try {
      const tossPayment = await this.tossPaymentsService.approveBillingPayment(
        billingKey,
        {
          amount: payment.amount,
          customerKey,
          orderId: payment.orderId,
          orderName: payment.orderName,
          ...(customerEmail ? { customerEmail } : {}),
          customerName,
        },
      );

      return this.validateApprovedTossPayment(
        tossPayment,
        payment.orderId,
        payment.amount,
      );
    } catch (error) {
      if (this.isPaymentConfigMissingError(error)) {
        throw error;
      }

      if (error instanceof TossPaymentRejectedError) {
        await this.subscriptionsRepository.failSubscriptionPayment(
          payment.id,
          new Date(),
        );
        await onRejected?.();

        throw new AppException(ErrorCode.SUBSCRIPTION_PAYMENT_FAILED);
      }

      if (error instanceof TossPaymentResultUnknownError) {
        return this.reconcileTossBillingPayment(
          payment.orderId,
          payment.amount,
        );
      }

      throw error;
    }
  };

  private reconcileTossBillingPayment = async (
    orderId: string,
    expectedAmount: number,
  ): Promise<TossPaymentConfirmResult> => {
    try {
      const tossPayment =
        await this.tossPaymentsService.getPaymentByOrderIdForReconciliation(
          orderId,
        );

      return this.validateApprovedTossPayment(
        tossPayment,
        orderId,
        expectedAmount,
      );
    } catch (error) {
      if (this.isPaymentConfigMissingError(error)) {
        throw error;
      }

      throw new AppException(ErrorCode.SUBSCRIPTION_PAYMENT_FAILED);
    }
  };

  private validateApprovedTossPayment = (
    tossPayment: TossPaymentConfirmResult,
    orderId: string,
    expectedAmount: number,
  ): TossPaymentConfirmResult => {
    if (
      tossPayment.orderId !== orderId ||
      tossPayment.totalAmount !== expectedAmount ||
      tossPayment.status !== PaymentStatus.DONE ||
      !tossPayment.approvedAt
    ) {
      throw new TossPaymentResultUnknownError();
    }

    const paidAt = new Date(tossPayment.approvedAt);

    if (Number.isNaN(paidAt.getTime())) {
      throw new TossPaymentResultUnknownError();
    }

    return tossPayment;
  };

  private saveSubscriptionWithRecovery = async (
    userId: number,
    payment: SubscriptionPaymentRecord,
    plan: SubscriptionPlanRecord,
    tossPayment: TossPaymentConfirmResult,
  ): Promise<SubscriptionRecord> => {
    try {
      return await this.saveSubscription(userId, payment, plan, tossPayment);
    } catch (saveError) {
      this.logRecoveryError(
        '구독 저장에 실패해 토스 결제 조회를 시도합니다.',
        payment,
        saveError,
      );

      let reconciledPayment: TossPaymentConfirmResult;

      try {
        reconciledPayment = await this.reconcileTossBillingPayment(
          payment.orderId,
          payment.amount,
        );
      } catch (reconcileError) {
        this.logRecoveryError(
          '토스 결제 조회를 통한 구독 복구에 실패했습니다.',
          payment,
          reconcileError,
        );
        throw saveError;
      }

      try {
        return await this.saveSubscription(
          userId,
          payment,
          plan,
          reconciledPayment,
        );
      } catch (retryError) {
        this.logRecoveryError(
          '조회된 토스 결제로 구독을 다시 저장하지 못했습니다.',
          payment,
          retryError,
        );
        throw saveError;
      }
    }
  };

  private logRecoveryError = (
    message: string,
    payment: SubscriptionPaymentRecord,
    error: unknown,
  ): void => {
    this.logger.error(message, {
      paymentId: payment.id.toString(),
      orderId: payment.orderId,
      error,
    });
  };

  private saveSubscription = (
    userId: number,
    payment: SubscriptionPaymentRecord,
    plan: SubscriptionPlanRecord,
    tossPayment: TossPaymentConfirmResult,
  ): Promise<SubscriptionRecord> => {
    const paidAt = new Date(tossPayment.approvedAt as string);
    const expiresAt = this.calculateExpiresAt(paidAt, plan.billingCycle);

    return this.subscriptionsRepository.completeSubscription(
      {
        userId,
        paymentId: payment.id,
        subscriptionPlanId: plan.id,
        providerPaymentId: tossPayment.paymentKey,
        paymentMethod: tossPayment.method,
        paidAt,
        receiptUrl: tossPayment.receipt?.url ?? null,
      },
      expiresAt,
    );
  };

  private calculateExpiresAt = (
    startedAt: Date,
    billingCycle: string,
  ): Date => {
    const expiresAt = new Date(startedAt);
    const originalDay = expiresAt.getUTCDate();

    expiresAt.setUTCDate(1);

    if (billingCycle === SubscriptionBillingCycle.MONTHLY) {
      expiresAt.setUTCMonth(expiresAt.getUTCMonth() + 1);
    } else if (billingCycle === SubscriptionBillingCycle.YEARLY) {
      expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + 1);
    } else {
      throw new AppException(ErrorCode.SUBSCRIPTION_PLAN_NOT_SUBSCRIBABLE);
    }

    const lastDayOfTargetMonth = new Date(
      Date.UTC(expiresAt.getUTCFullYear(), expiresAt.getUTCMonth() + 1, 0),
    ).getUTCDate();

    expiresAt.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth));

    return expiresAt;
  };

  private createOrderId = (userId: number): string => {
    return `${SubscriptionOrder.ORDER_ID_PREFIX}_${userId}_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`;
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

  private toSubscriptionResponseDto = (
    subscription: SubscriptionRecord,
  ): SubscriptionResponseDto => ({
    subscriptionId: Number(subscription.id),
    status: SubscriptionStatus.ACTIVE,
    plan: this.toPlanSummary(subscription.subscriptionPlan),
    startedAt: subscription.startedAt,
    expiresAt: subscription.expiresAt,
    autoRenew: subscription.autoRenew,
    nextBillingAt: subscription.autoRenew ? subscription.expiresAt : null,
    pendingPlanChange:
      subscription.autoRenew &&
      subscription.pendingPlan &&
      subscription.planChangeRequestedAt
        ? {
            plan: this.toPlanSummary(subscription.pendingPlan),
            effectiveAt: subscription.expiresAt,
            requestedAt: subscription.planChangeRequestedAt,
          }
        : null,
  });

  private toFreeSubscriptionResponseDto = (
    plan: SubscriptionPlanRecord,
  ): SubscriptionResponseDto => ({
    subscriptionId: null,
    status: SubscriptionStatus.FREE,
    plan: this.toPlanSummary(plan),
    startedAt: null,
    expiresAt: null,
    autoRenew: false,
    nextBillingAt: null,
    pendingPlanChange: null,
  });

  private toPlanSummary = (plan: SubscriptionPlanRecord) => ({
    id: Number(plan.id),
    code: plan.code,
    name: plan.name,
    price: plan.price,
    billingCycle: plan.billingCycle,
  });
}
