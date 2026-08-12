import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BillingKeyStatus } from '../billing-keys/billing-keys.constant';
import { PaymentProvider, PaymentStatus } from '../payments/payments.constant';
import {
  SubscriptionBillingCycle,
  SubscriptionOrder,
} from './subscriptions.constant';
import {
  CompleteSubscriptionData,
  DueSubscriptionRenewal,
  PendingPlanChangeUpdateResult,
  RecordSubscriptionRenewalFailureData,
  ReserveSubscriptionPaymentData,
  SubscriptionAutoRenewalUpdateResult,
  SubscriptionPaymentRecord,
  SubscriptionPlanRecord,
  SubscriptionRecord,
  SubscriptionRenewalReservation,
  SubscriptionStartReservation,
  UpdatePendingPlanChangeData,
  UpdateSubscriptionAutoRenewalData,
} from './subscriptions.types';

@Injectable()
export class SubscriptionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findCurrentSubscription = (
    userId: number,
  ): Promise<SubscriptionRecord | null> => {
    return this.prisma.userSubscription.findFirst({
      where: {
        userId: BigInt(userId),
        currentForUser: {
          is: {
            id: BigInt(userId),
          },
        },
      },
      include: {
        subscriptionPlan: true,
        pendingPlan: true,
      },
    });
  };

  findActiveFreePlan = (): Promise<SubscriptionPlanRecord | null> => {
    return this.prisma.subscriptionPlan.findFirst({
      where: {
        code: 'FREE',
        isActive: true,
      },
    });
  };

  findActivePlanById = (
    subscriptionPlanId: number,
  ): Promise<SubscriptionPlanRecord | null> => {
    return this.prisma.subscriptionPlan.findFirst({
      where: {
        id: BigInt(subscriptionPlanId),
        isActive: true,
      },
    });
  };

  reserveSubscriptionPayment = (
    data: ReserveSubscriptionPaymentData,
  ): Promise<SubscriptionStartReservation> => {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id
        FROM users
        WHERE id = ${BigInt(data.userId)}
        FOR UPDATE
      `;

      const user = await tx.user.findUnique({
        where: { id: BigInt(data.userId) },
        select: {
          id: true,
          email: true,
          nickname: true,
          status: true,
          currentSubscriptionId: true,
        },
      });

      if (!user) {
        return {
          user: null,
          plan: null,
          billingKey: null,
          currentSubscription: null,
          pendingPayment: null,
          payment: null,
        };
      }

      const [plan, billingKey, currentSubscription, pendingPayment] =
        await Promise.all([
          tx.subscriptionPlan.findFirst({
            where: {
              id: BigInt(data.subscriptionPlanId),
              isActive: true,
            },
          }),
          tx.billingKey.findFirst({
            where: {
              id: BigInt(data.billingKeyId),
              userId: BigInt(data.userId),
              status: BillingKeyStatus.ACTIVE,
            },
          }),
          user.currentSubscriptionId
            ? tx.userSubscription.findFirst({
                where: {
                  id: user.currentSubscriptionId,
                  userId: BigInt(data.userId),
                  expiresAt: { gt: data.now },
                },
                include: { subscriptionPlan: true, pendingPlan: true },
              })
            : Promise.resolve(null),
          tx.payment.findFirst({
            where: {
              userId: BigInt(data.userId),
              usersSubscriptionId: null,
              billingKeyId: { not: null },
              status: PaymentStatus.READY,
            },
            include: { receipt: true },
            orderBy: { createdAt: 'desc' },
          }),
        ]);

      let payment: SubscriptionPaymentRecord | null = null;

      if (
        user.status === 'ACTIVE' &&
        plan &&
        billingKey &&
        !currentSubscription &&
        !pendingPayment
      ) {
        payment = await tx.payment.create({
          data: {
            userId: BigInt(data.userId),
            billingKeyId: billingKey.id,
            orderId: data.orderId,
            orderName: `${plan.name} 플랜 구독`,
            amount: plan.price,
            paymentProvider: data.paymentProvider,
            status: data.paymentStatus,
          },
          include: { receipt: true },
        });
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          status: user.status,
        },
        plan,
        billingKey,
        currentSubscription,
        pendingPayment,
        payment,
      };
    });
  };

  failSubscriptionPayment = (
    paymentId: bigint,
    failedAt: Date,
  ): Promise<void> => {
    return this.prisma.payment
      .updateMany({
        where: {
          id: paymentId,
          status: PaymentStatus.READY,
        },
        data: {
          status: PaymentStatus.FAILED,
          failedAt,
        },
      })
      .then(() => undefined);
  };

  completeSubscription = (
    data: CompleteSubscriptionData,
    expiresAt: Date,
  ): Promise<SubscriptionRecord> => {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id
        FROM users
        WHERE id = ${BigInt(data.userId)}
        FOR UPDATE
      `;

      const user = await tx.user.findUniqueOrThrow({
        where: { id: BigInt(data.userId) },
        select: { currentSubscriptionId: true },
      });

      if (user.currentSubscriptionId) {
        const currentSubscription = await tx.userSubscription.findFirst({
          where: {
            id: user.currentSubscriptionId,
            userId: BigInt(data.userId),
            expiresAt: { gt: data.paidAt },
          },
          include: { subscriptionPlan: true, pendingPlan: true },
        });

        if (currentSubscription) {
          return currentSubscription;
        }
      }

      const subscription = await tx.userSubscription.create({
        data: {
          userId: BigInt(data.userId),
          subscriptionPlanId: data.subscriptionPlanId,
          startedAt: data.paidAt,
          expiresAt,
          autoRenew: true,
        },
        include: { subscriptionPlan: true, pendingPlan: true },
      });

      await tx.payment.update({
        where: { id: data.paymentId },
        data: {
          usersSubscriptionId: subscription.id,
          providerPaymentId: data.providerPaymentId,
          paymentMethod: data.paymentMethod,
          status: PaymentStatus.DONE,
          paidAt: data.paidAt,
          failedAt: null,
        },
      });

      if (data.receiptUrl) {
        await tx.paymentReceipt.upsert({
          where: { paymentId: data.paymentId },
          update: {
            receiptUrl: data.receiptUrl,
            issuedAt: data.paidAt,
          },
          create: {
            paymentId: data.paymentId,
            receiptUrl: data.receiptUrl,
            issuedAt: data.paidAt,
          },
        });
      }

      if (user.currentSubscriptionId) {
        await tx.userSubscription.update({
          where: { id: user.currentSubscriptionId },
          data: {
            pendingPlanId: null,
            planChangeRequestedAt: null,
            renewalRetryAt: null,
          },
        });
      }

      await tx.user.update({
        where: { id: BigInt(data.userId) },
        data: { currentSubscriptionId: subscription.id },
      });

      return subscription;
    });
  };

  updatePendingPlanChange = (
    data: UpdatePendingPlanChangeData,
  ): Promise<PendingPlanChangeUpdateResult> => {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id
        FROM users
        WHERE id = ${BigInt(data.userId)}
        FOR UPDATE
      `;

      const user = await tx.user.findUnique({
        where: { id: BigInt(data.userId) },
        select: { currentSubscriptionId: true },
      });

      if (!user) {
        return this.emptyPendingPlanChangeResult();
      }

      const [subscription, targetPlan] = await Promise.all([
        tx.userSubscription.findFirst({
          where: {
            id: BigInt(data.subscriptionId),
            userId: BigInt(data.userId),
          },
          include: { subscriptionPlan: true, pendingPlan: true },
        }),
        data.pendingPlanId === null
          ? Promise.resolve(null)
          : tx.subscriptionPlan.findFirst({
              where: {
                id: BigInt(data.pendingPlanId),
                isActive: true,
              },
            }),
      ]);

      if (!subscription) {
        return this.emptyPendingPlanChangeResult(targetPlan);
      }

      const isCurrent = user.currentSubscriptionId === subscription.id;
      const isExpired = subscription.expiresAt <= data.changedAt;
      const isAutoRenewEnabled = subscription.autoRenew;
      const isSameCurrentPlan =
        targetPlan?.id === subscription.subscriptionPlanId;
      const canUpdate =
        isCurrent &&
        !isExpired &&
        isAutoRenewEnabled &&
        !isSameCurrentPlan &&
        (data.pendingPlanId === null || targetPlan !== null);

      if (!canUpdate) {
        return {
          subscription,
          targetPlan,
          isCurrent,
          isExpired,
          isAutoRenewEnabled,
          isSameCurrentPlan,
        };
      }

      if (subscription.pendingPlanId === targetPlan?.id) {
        return {
          subscription,
          targetPlan,
          isCurrent: true,
          isExpired: false,
          isAutoRenewEnabled: true,
          isSameCurrentPlan: false,
        };
      }

      const updatedSubscription = await tx.userSubscription.update({
        where: { id: subscription.id },
        data: {
          pendingPlanId: targetPlan?.id ?? null,
          planChangeRequestedAt: targetPlan ? data.changedAt : null,
        },
        include: { subscriptionPlan: true, pendingPlan: true },
      });

      return {
        subscription: updatedSubscription,
        targetPlan,
        isCurrent: true,
        isExpired: false,
        isAutoRenewEnabled: true,
        isSameCurrentPlan: false,
      };
    });
  };

  findDueSubscriptionRenewals = (
    now: Date,
    take: number,
    maxAttempts: number,
    afterSubscriptionId?: bigint,
  ): Promise<DueSubscriptionRenewal[]> => {
    return this.prisma.userSubscription.findMany({
      where: {
        ...(afterSubscriptionId === undefined
          ? {}
          : { id: { gt: afterSubscriptionId } }),
        autoRenew: true,
        expiresAt: { lte: now },
        renewalAttemptCount: { lt: maxAttempts },
        OR: [{ renewalRetryAt: null }, { renewalRetryAt: { lte: now } }],
        currentForUser: {
          is: { status: 'ACTIVE' },
        },
      },
      select: { id: true, userId: true },
      orderBy: { id: 'asc' },
      take,
    });
  };

  reserveSubscriptionRenewal = (
    userId: bigint,
    subscriptionId: bigint,
    now: Date,
    maxAttempts: number,
  ): Promise<SubscriptionRenewalReservation> => {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id
        FROM users
        WHERE id = ${userId}
        FOR UPDATE
      `;

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          nickname: true,
          status: true,
          currentSubscriptionId: true,
        },
      });
      const sourceSubscription = await tx.userSubscription.findFirst({
        where: { id: subscriptionId, userId },
        include: { subscriptionPlan: true, pendingPlan: true },
      });

      if (
        !user ||
        !sourceSubscription ||
        user.status !== 'ACTIVE' ||
        user.currentSubscriptionId !== sourceSubscription.id ||
        !sourceSubscription.autoRenew ||
        sourceSubscription.expiresAt > now ||
        sourceSubscription.renewalAttemptCount >= maxAttempts ||
        (sourceSubscription.renewalRetryAt !== null &&
          sourceSubscription.renewalRetryAt > now)
      ) {
        return this.toRenewalReservation(
          'NOT_ELIGIBLE',
          null,
          sourceSubscription,
        );
      }

      const attemptNumber = sourceSubscription.renewalAttemptCount + 1;
      const plan =
        sourceSubscription.pendingPlan ?? sourceSubscription.subscriptionPlan;
      const supportedBillingCycles = Object.values(SubscriptionBillingCycle);

      if (
        !plan.isActive ||
        plan.price <= 0 ||
        !supportedBillingCycles.includes(
          plan.billingCycle as (typeof supportedBillingCycles)[number],
        )
      ) {
        return this.toRenewalReservation(
          'PLAN_UNAVAILABLE',
          attemptNumber,
          sourceSubscription,
          {
            id: user.id,
            email: user.email,
            nickname: user.nickname,
            status: user.status,
          },
          plan,
        );
      }

      const previousPayment = await tx.payment.findFirst({
        where: {
          userId,
          usersSubscriptionId: sourceSubscription.id,
          status: PaymentStatus.DONE,
          billingKey: { is: { status: BillingKeyStatus.ACTIVE } },
        },
        include: { billingKey: true },
        orderBy: { paidAt: 'desc' },
      });
      const billingKey =
        previousPayment?.billingKey ??
        (await tx.billingKey.findFirst({
          where: { userId, status: BillingKeyStatus.ACTIVE },
          orderBy: { createdAt: 'desc' },
        }));

      if (!billingKey) {
        return this.toRenewalReservation(
          'BILLING_KEY_UNAVAILABLE',
          attemptNumber,
          sourceSubscription,
          {
            id: user.id,
            email: user.email,
            nickname: user.nickname,
            status: user.status,
          },
          plan,
        );
      }

      const orderId = `${SubscriptionOrder.RENEWAL_ORDER_ID_PREFIX}_${sourceSubscription.id.toString()}_${attemptNumber}`;
      const existingPayment = await tx.payment.findUnique({
        where: { orderId },
        include: { receipt: true },
      });

      if (existingPayment?.status === PaymentStatus.FAILED) {
        return this.toRenewalReservation(
          'FAILED_PAYMENT',
          attemptNumber,
          sourceSubscription,
          {
            id: user.id,
            email: user.email,
            nickname: user.nickname,
            status: user.status,
          },
          plan,
          billingKey,
          existingPayment,
        );
      }

      const payment =
        existingPayment ??
        (await tx.payment.create({
          data: {
            userId,
            billingKeyId: billingKey.id,
            orderId,
            orderName: `${plan.name} 플랜 자동갱신`,
            amount: plan.price,
            paymentProvider: PaymentProvider.TOSS,
            status: PaymentStatus.READY,
          },
          include: { receipt: true },
        }));

      return this.toRenewalReservation(
        'READY',
        attemptNumber,
        sourceSubscription,
        {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          status: user.status,
        },
        plan,
        billingKey,
        payment,
      );
    });
  };

  recordSubscriptionRenewalFailure = (
    data: RecordSubscriptionRenewalFailureData,
  ): Promise<void> => {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id
        FROM users
        WHERE id = ${data.userId}
        FOR UPDATE
      `;

      const user = await tx.user.findUnique({
        where: { id: data.userId },
        select: { currentSubscriptionId: true },
      });
      const subscription = await tx.userSubscription.findFirst({
        where: { id: data.subscriptionId, userId: data.userId },
      });

      if (
        !user ||
        !subscription ||
        user.currentSubscriptionId !== subscription.id ||
        !subscription.autoRenew ||
        subscription.renewalAttemptCount >= data.attemptNumber
      ) {
        return;
      }

      const attemptsExhausted = data.attemptNumber >= data.maxAttempts;

      await tx.userSubscription.update({
        where: { id: subscription.id },
        data: {
          renewalAttemptCount: data.attemptNumber,
          renewalRetryAt: attemptsExhausted ? null : data.retryAt,
          ...(attemptsExhausted
            ? {
                autoRenew: false,
                canceledAt: data.failedAt,
                pendingPlanId: null,
                planChangeRequestedAt: null,
              }
            : {}),
        },
      });
    });
  };

  updateSubscriptionAutoRenewal = (
    data: UpdateSubscriptionAutoRenewalData,
  ): Promise<SubscriptionAutoRenewalUpdateResult> => {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id
        FROM users
        WHERE id = ${BigInt(data.userId)}
        FOR UPDATE
      `;

      const user = await tx.user.findUnique({
        where: { id: BigInt(data.userId) },
        select: { currentSubscriptionId: true },
      });

      if (!user) {
        return {
          subscription: null,
          isCurrent: false,
          isExpired: false,
        };
      }

      const subscription = await tx.userSubscription.findFirst({
        where: {
          id: BigInt(data.subscriptionId),
          userId: BigInt(data.userId),
        },
        include: { subscriptionPlan: true, pendingPlan: true },
      });

      if (!subscription) {
        return {
          subscription: null,
          isCurrent: false,
          isExpired: false,
        };
      }

      const isCurrent = user.currentSubscriptionId === subscription.id;
      const isExpired = subscription.expiresAt <= data.changedAt;

      if (
        !isCurrent ||
        isExpired ||
        subscription.autoRenew === data.autoRenew
      ) {
        return { subscription, isCurrent, isExpired };
      }

      const updatedSubscription = await tx.userSubscription.update({
        where: { id: subscription.id },
        data: {
          autoRenew: data.autoRenew,
          canceledAt: data.autoRenew ? null : data.changedAt,
          renewalAttemptCount: 0,
          renewalRetryAt: null,
          ...(data.autoRenew
            ? {}
            : {
                pendingPlanId: null,
                planChangeRequestedAt: null,
              }),
        },
        include: { subscriptionPlan: true, pendingPlan: true },
      });

      return {
        subscription: updatedSubscription,
        isCurrent: true,
        isExpired: false,
      };
    });
  };

  private emptyPendingPlanChangeResult = (
    targetPlan: SubscriptionPlanRecord | null = null,
  ): PendingPlanChangeUpdateResult => ({
    subscription: null,
    targetPlan,
    isCurrent: false,
    isExpired: false,
    isAutoRenewEnabled: false,
    isSameCurrentPlan: false,
  });

  private toRenewalReservation = (
    status: SubscriptionRenewalReservation['status'],
    attemptNumber: number | null,
    sourceSubscription: SubscriptionRecord | null,
    user: SubscriptionRenewalReservation['user'] = null,
    plan: SubscriptionRenewalReservation['plan'] = null,
    billingKey: SubscriptionRenewalReservation['billingKey'] = null,
    payment: SubscriptionRenewalReservation['payment'] = null,
  ): SubscriptionRenewalReservation => ({
    status,
    attemptNumber,
    sourceSubscription,
    user,
    plan,
    billingKey,
    payment,
  });
}
