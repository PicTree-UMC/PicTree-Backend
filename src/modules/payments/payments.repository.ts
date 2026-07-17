import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentRecord, PaymentSubscriptionPlanRecord } from './payments.types';

type CreatePaymentData = {
  userId: number;
  orderId: string;
  orderName: string;
  amount: number;
  paymentProvider: string;
  status: string;
};

type CompletePaymentData = {
  paymentId: bigint;
  providerPaymentId: string;
  paymentMethod: string | null;
  status: string;
  paidAt: Date;
  receiptUrl: string | null;
};

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findSubscriptionPlanById = (
    subscriptionPlanId: number,
  ): Promise<PaymentSubscriptionPlanRecord | null> => {
    return this.prisma.subscriptionPlan.findUnique({
      where: {
        id: BigInt(subscriptionPlanId),
      },
      select: {
        id: true,
        name: true,
        price: true,
        isActive: true,
      },
    });
  };

  createPayment = (
    createPaymentData: CreatePaymentData,
  ): Promise<PaymentRecord> => {
    return this.prisma.payment.create({
      data: {
        userId: BigInt(createPaymentData.userId),
        orderId: createPaymentData.orderId,
        orderName: createPaymentData.orderName,
        amount: createPaymentData.amount,
        paymentProvider: createPaymentData.paymentProvider,
        status: createPaymentData.status,
      },
      include: {
        receipt: true,
      },
    });
  };

  findPaymentByOrderId = (orderId: string): Promise<PaymentRecord | null> => {
    return this.prisma.payment.findUnique({
      where: {
        orderId,
      },
      include: {
        receipt: true,
      },
    });
  };

  completePayment = async (
    completePaymentData: CompletePaymentData,
  ): Promise<PaymentRecord> => {
    return this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: {
          id: completePaymentData.paymentId,
        },
        data: {
          providerPaymentId: completePaymentData.providerPaymentId,
          paymentMethod: completePaymentData.paymentMethod,
          status: completePaymentData.status,
          paidAt: completePaymentData.paidAt,
        },
        include: {
          receipt: true,
        },
      });

      if (completePaymentData.receiptUrl) {
        await tx.paymentReceipt.upsert({
          where: {
            paymentId: completePaymentData.paymentId,
          },
          update: {
            receiptUrl: completePaymentData.receiptUrl,
            issuedAt: completePaymentData.paidAt,
          },
          create: {
            paymentId: completePaymentData.paymentId,
            receiptUrl: completePaymentData.receiptUrl,
            issuedAt: completePaymentData.paidAt,
          },
        });
      }

      return tx.payment.findUniqueOrThrow({
        where: {
          id: updatedPayment.id,
        },
        include: {
          receipt: true,
        },
      });
    });
  };

  failPayment = (
    paymentId: bigint,
    providerPaymentId: string,
    failedAt: Date,
  ): Promise<PaymentRecord> => {
    return this.prisma.payment.update({
      where: {
        id: paymentId,
      },
      data: {
        providerPaymentId,
        status: 'FAILED',
        failedAt,
      },
      include: {
        receipt: true,
      },
    });
  };
}
