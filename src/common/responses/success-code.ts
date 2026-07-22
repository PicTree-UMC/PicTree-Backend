import { HttpStatus } from '@nestjs/common';

export const SuccessCode = {
  // Common
  OK: {
    status: HttpStatus.OK,
    code: 'COMMON200',
    message: '요청이 성공했습니다.',
  },
  CREATED: {
    status: HttpStatus.CREATED,
    code: 'COMMON201',
    message: '생성되었습니다.',
  },

  // Payment
  PAYMENT_CANCELED: {
    status: HttpStatus.OK,
    code: 'PAYMENT200',
    message: '결제가 취소되었습니다.',
  },
  PAYMENT_WEBHOOK_RECEIVED: {
    status: HttpStatus.OK,
    code: 'PAYMENT200',
    message: '결제 웹훅을 처리했습니다.',
  },

  // Billing Key
  BILLING_KEY_ISSUED: {
    status: HttpStatus.CREATED,
    code: 'BILLING_KEY201',
    message: '자동결제 수단이 등록되었습니다.',
  },
  BILLING_KEY_DEACTIVATED: {
    status: HttpStatus.OK,
    code: 'BILLING_KEY200',
    message: '자동결제 수단이 삭제되었습니다.',
  },

  // Subscription
  SUBSCRIPTION_STARTED: {
    status: HttpStatus.CREATED,
    code: 'SUBSCRIPTION201',
    message: '구독이 시작되었습니다.',
  },
  SUBSCRIPTION_CANCELED: {
    status: HttpStatus.OK,
    code: 'SUBSCRIPTION200',
    message: '구독 자동갱신이 해지되었습니다.',
  },
  SUBSCRIPTION_RESUMED: {
    status: HttpStatus.OK,
    code: 'SUBSCRIPTION200',
    message: '구독 자동갱신이 재개되었습니다.',
  },
} as const;

export type SuccessCodeType = (typeof SuccessCode)[keyof typeof SuccessCode];
