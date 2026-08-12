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
  RENEWAL_ORDER_ID_PREFIX: 'SUBSCRIPTION_RENEWAL',
} as const;

export const SubscriptionRenewalPolicy = {
  INTERVAL_MS: 15 * 60 * 1000,
  RETRY_DELAY_MS: 60 * 60 * 1000,
  MAX_ATTEMPTS: 3,
  BATCH_SIZE: 50,
} as const;
