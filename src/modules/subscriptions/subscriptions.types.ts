import { Prisma } from '@prisma/client';

export type SubscriptionPlanRecord = Prisma.SubscriptionPlanGetPayload<
  Record<string, never>
>;

export type SubscriptionBillingKeyRecord = Prisma.BillingKeyGetPayload<
  Record<string, never>
>;

export type SubscriptionRecord = Prisma.UserSubscriptionGetPayload<{
  include: {
    subscriptionPlan: true;
  };
}>;

export type SubscriptionPaymentRecord = Prisma.PaymentGetPayload<{
  include: {
    receipt: true;
  };
}>;

export type SubscriptionUserRecord = {
  id: bigint;
  email: string | null;
  nickname: string;
  status: string;
};

export type ReserveSubscriptionPaymentData = {
  userId: number;
  subscriptionPlanId: number;
  billingKeyId: number;
  orderId: string;
  paymentProvider: string;
  paymentStatus: string;
  now: Date;
};

export type SubscriptionStartReservation = {
  user: SubscriptionUserRecord | null;
  plan: SubscriptionPlanRecord | null;
  billingKey: SubscriptionBillingKeyRecord | null;
  currentSubscription: SubscriptionRecord | null;
  pendingPayment: SubscriptionPaymentRecord | null;
  payment: SubscriptionPaymentRecord | null;
};

export type CompleteSubscriptionData = {
  userId: number;
  paymentId: bigint;
  subscriptionPlanId: bigint;
  providerPaymentId: string;
  paymentMethod: string | null;
  paidAt: Date;
  receiptUrl: string | null;
};

export type UpdateSubscriptionAutoRenewalData = {
  userId: number;
  subscriptionId: number;
  autoRenew: boolean;
  changedAt: Date;
};

export type SubscriptionAutoRenewalUpdateResult = {
  subscription: SubscriptionRecord | null;
  isCurrent: boolean;
  isExpired: boolean;
};
