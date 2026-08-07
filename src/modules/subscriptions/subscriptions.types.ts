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
    pendingPlan: true;
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

export type UpdatePendingPlanChangeData = {
  userId: number;
  subscriptionId: number;
  pendingPlanId: number | null;
  changedAt: Date;
};

export type PendingPlanChangeUpdateResult = {
  subscription: SubscriptionRecord | null;
  targetPlan: SubscriptionPlanRecord | null;
  isCurrent: boolean;
  isExpired: boolean;
  isAutoRenewEnabled: boolean;
  isSameCurrentPlan: boolean;
};

export type DueSubscriptionRenewal = {
  id: bigint;
  userId: bigint;
};

export type SubscriptionRenewalReservationStatus =
  | 'READY'
  | 'NOT_ELIGIBLE'
  | 'PLAN_UNAVAILABLE'
  | 'BILLING_KEY_UNAVAILABLE'
  | 'FAILED_PAYMENT';

export type SubscriptionRenewalReservation = {
  status: SubscriptionRenewalReservationStatus;
  attemptNumber: number | null;
  sourceSubscription: SubscriptionRecord | null;
  user: SubscriptionUserRecord | null;
  plan: SubscriptionPlanRecord | null;
  billingKey: SubscriptionBillingKeyRecord | null;
  payment: SubscriptionPaymentRecord | null;
};

export type RecordSubscriptionRenewalFailureData = {
  userId: bigint;
  subscriptionId: bigint;
  attemptNumber: number;
  failedAt: Date;
  retryAt: Date;
  maxAttempts: number;
};
