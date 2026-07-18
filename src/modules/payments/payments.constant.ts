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

export const PaymentOrder = {
  ORDER_ID_PREFIX: 'ORDER',
  CUSTOMER_KEY_PREFIX: 'USER',
} as const;
