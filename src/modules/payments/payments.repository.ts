import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentStatus } from './payments.constant';
import { PaymentRecord, PaymentSubscriptionPlanRecord } from './payments.types';

type CreatePaymentData = {
  userId: number;
  orderId: string;
  orderName: string;
  amount: number;
  paymentProvider: string;
  status: string;
};

type UpdatePaymentAfterConfirmData = {
  paymentId: bigint;
  providerPaymentId: string;
  paymentMethod: string | null;
  status: string;
  paidAt: Date | null;
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

  updatePaymentAfterConfirm = (
    updatePaymentAfterConfirmData: UpdatePaymentAfterConfirmData,
  ): Promise<PaymentRecord> => {
    return this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: {
          id: updatePaymentAfterConfirmData.paymentId,
        },
        data: {
          providerPaymentId: updatePaymentAfterConfirmData.providerPaymentId,
          paymentMethod: updatePaymentAfterConfirmData.paymentMethod,
          status: updatePaymentAfterConfirmData.status,
          paidAt: updatePaymentAfterConfirmData.paidAt,
          failedAt: null,
        },
        include: {
          receipt: true,
        },
      });

      if (updatePaymentAfterConfirmData.receiptUrl) {
        await tx.paymentReceipt.upsert({
          where: {
            paymentId: updatePaymentAfterConfirmData.paymentId,
          },
          update: {
            receiptUrl: updatePaymentAfterConfirmData.receiptUrl,
            issuedAt: updatePaymentAfterConfirmData.paidAt,
          },
          create: {
            paymentId: updatePaymentAfterConfirmData.paymentId,
            receiptUrl: updatePaymentAfterConfirmData.receiptUrl,
            issuedAt: updatePaymentAfterConfirmData.paidAt,
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
  ): Promise<Prisma.BatchPayload> => {
    return this.prisma.payment.updateMany({
      where: {
        id: paymentId,
        status: PaymentStatus.READY,
      },
      data: {
        providerPaymentId,
        status: PaymentStatus.FAILED,
        failedAt,
      },
    });
  };

  updatePaymentAfterCancel = (
    paymentId: bigint,
    canceledAt: Date,
  ): Promise<PaymentRecord> => {
    return this.prisma.$transaction(async (tx) => {
      await tx.payment.updateMany({
        where: {
          id: paymentId,
          status: PaymentStatus.DONE,
        },
        data: {
          status: PaymentStatus.CANCELED,
          canceledAt,
        },
      });

      return tx.payment.findUniqueOrThrow({
        where: {
          id: paymentId,
        },
        include: {
          receipt: true,
        },
      });
    });
  };

  findPaymentsByUserId = async (
    userId: number,
    page: number,
    size: number,
    status?: string,
  ): Promise<[PaymentRecord[], number]> => {
    const where: Prisma.PaymentWhereInput = {
      userId: BigInt(userId),
      ...(status ? { status } : {}),
    };

    return Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          receipt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * size,
        take: size,
      }),
      this.prisma.payment.count({ where }),
    ]);
  };

  findPaymentByIdAndUserId = (
    paymentId: number,
    userId: number,
  ): Promise<PaymentRecord | null> => {
    return this.prisma.payment.findFirst({
      where: {
        id: BigInt(paymentId),
        userId: BigInt(userId),
      },
      include: {
        receipt: true,
      },
    });
  };
}
