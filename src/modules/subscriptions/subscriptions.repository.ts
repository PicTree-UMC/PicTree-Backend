import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BillingKeyStatus } from '../billing-keys/billing-keys.constant';
import { PaymentStatus } from '../payments/payments.constant';
import {
  CompleteSubscriptionData,
  ReserveSubscriptionPaymentData,
  SubscriptionPaymentRecord,
  SubscriptionPlanRecord,
  SubscriptionRecord,
  SubscriptionStartReservation,
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
                include: { subscriptionPlan: true },
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
          include: { subscriptionPlan: true },
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
        include: { subscriptionPlan: true },
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

      await tx.user.update({
        where: { id: BigInt(data.userId) },
        data: { currentSubscriptionId: subscription.id },
      });

      return subscription;
    });
  };
}
