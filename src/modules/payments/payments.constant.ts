export const PaymentProvider = {
  TOSS: 'TOSS',
} as const;

export const PaymentStatus = {
  READY: 'READY',
  DONE: 'DONE',
  FAILED: 'FAILED',
  CANCELED: 'CANCELED',
} as const;

export const PaymentOrder = {
  ORDER_ID_PREFIX: 'ORDER',
  CUSTOMER_KEY_PREFIX: 'USER',
} as const;
