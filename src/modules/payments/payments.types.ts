import { Prisma } from '@prisma/client';

export type PaymentSubscriptionPlanRecord = Pick<
  Prisma.SubscriptionPlanGetPayload<Record<string, never>>,
  'id' | 'name' | 'price' | 'isActive'
>;

export type PaymentRecord = Prisma.PaymentGetPayload<{
  include: {
    receipt: true;
  };
}>;

export type SynchronizePaymentFromWebhookData = {
  paymentId: bigint;
  providerPaymentId: string;
  paymentMethod: string | null;
  status: string;
  paidAt: Date | null;
  failedAt: Date | null;
  canceledAt: Date | null;
  receiptUrl: string | null;
};
