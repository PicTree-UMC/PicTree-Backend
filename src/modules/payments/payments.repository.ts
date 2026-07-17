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
}
