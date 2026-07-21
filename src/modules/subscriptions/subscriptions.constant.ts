export const SubscriptionStatus = {
  FREE: 'FREE',
  ACTIVE: 'ACTIVE',
} as const;

export const SubscriptionPlanCode = {
  FREE: 'FREE',
} as const;

export const SubscriptionBillingCycle = {
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY',
} as const;

export const SubscriptionOrder = {
  ORDER_ID_PREFIX: 'SUBSCRIPTION',
} as const;
