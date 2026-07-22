export const PaymentProvider = {
  TOSS: 'TOSS',
} as const;

export const PaymentStatus = {
  READY: 'READY',
  WAITING_FOR_DEPOSIT: 'WAITING_FOR_DEPOSIT',
  DONE: 'DONE',
  FAILED: 'FAILED',
  CANCELED: 'CANCELED',
} as const;

export type PaymentStatusType =
  (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const PaymentStatusPriority: Record<PaymentStatusType, number> = {
  [PaymentStatus.READY]: 0,
  [PaymentStatus.WAITING_FOR_DEPOSIT]: 1,
  [PaymentStatus.DONE]: 2,
  [PaymentStatus.FAILED]: 3,
  [PaymentStatus.CANCELED]: 3,
};

export const PaymentOrder = {
  ORDER_ID_PREFIX: 'ORDER',
  CUSTOMER_KEY_PREFIX: 'USER',
} as const;

export const PaymentIdempotencyKey = {
  CANCEL_PREFIX: 'CANCEL_PAYMENT',
} as const;

export const TossPaymentWebhookEvent = {
  PAYMENT_STATUS_CHANGED: 'PAYMENT_STATUS_CHANGED',
} as const;

export const TossPaymentWebhookHeader = {
  TRANSMISSION_ID: 'tosspayments-webhook-transmission-id',
} as const;
