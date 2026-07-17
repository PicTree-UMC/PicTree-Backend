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
