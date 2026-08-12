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
  SUBSCRIPTION_PLAN_CHANGE_SCHEDULED: {
    status: HttpStatus.OK,
    code: 'SUBSCRIPTION200',
    message: '구독 플랜 변경이 예약되었습니다.',
  },
  SUBSCRIPTION_PLAN_CHANGE_CANCELED: {
    status: HttpStatus.OK,
    code: 'SUBSCRIPTION200',
    message: '예약된 구독 플랜 변경이 취소되었습니다.',
  },

  // Favorite
  FAVORITE_LIST_RETRIEVED: {
    status: HttpStatus.OK,
    code: 'FAVORITE200-1',
    message: '즐겨찾기 장소 조회가 완료되었습니다.',
  },
  FAVORITE_TOGGLED: {
    status: HttpStatus.OK,
    code: 'FAVORITE200-2',
    message: '즐겨찾기 상태가 변경되었습니다.',
  },

  // Nearby Alert
  NEARBY_ALERT_CHECKED: {
    status: HttpStatus.OK,
    code: 'NEARBY_ALERT200-1',
    message: '근처 나무 알림 확인이 완료되었습니다.',
  },
  NEARBY_ALERT_LOGS_RETRIEVED: {
    status: HttpStatus.OK,
    code: 'NEARBY_ALERT200-2',
    message: '근처 나무 알림 기록 조회가 완료되었습니다.',
  },
  NEARBY_ALERT_OPENED: {
    status: HttpStatus.OK,
    code: 'NEARBY_ALERT200-3',
    message: '근처 나무 알림 확인 처리가 완료되었습니다.',
  },
  NEARBY_ALERT_DELETED: {
    status: HttpStatus.OK,
    code: 'NEARBY_ALERT200-4',
    message: '근처 나무 알림 기록이 삭제되었습니다.',
  },

  // Push Subscription
  PUSH_SUBSCRIPTION_REGISTERED: {
    status: HttpStatus.CREATED,
    code: 'PUSH_SUBSCRIPTION201-1',
    message: 'PWA 푸시 구독이 등록되었습니다.',
  },
  PUSH_SUBSCRIPTIONS_RETRIEVED: {
    status: HttpStatus.OK,
    code: 'PUSH_SUBSCRIPTION200-1',
    message: 'PWA 푸시 구독 조회가 완료되었습니다.',
  },
  PUSH_SUBSCRIPTION_DEACTIVATED: {
    status: HttpStatus.OK,
    code: 'PUSH_SUBSCRIPTION200-2',
    message: 'PWA 푸시 구독이 비활성화되었습니다.',
  },

  // Calendar
  CALENDAR_RETRIEVED: {
    status: HttpStatus.OK,
    code: 'CALENDAR200',
    message: '여행 캘린더 조회가 완료되었습니다.',
  },

  // Blog Draft
  BLOG_DRAFT_GENERATED: {
    status: HttpStatus.OK,
    code: 'BLOG200-2',
    message: 'AI 블로그 초안 생성이 완료되었습니다.',
  },
  BLOG_DRAFT_SAVED: {
    status: HttpStatus.CREATED,
    code: 'BLOG201',
    message: 'AI 블로그 초안이 저장되었습니다.',
  },
  BLOG_DRAFT_RETRIEVED: {
    status: HttpStatus.OK,
    code: 'BLOG200-1',
    message: 'AI 블로그 초안 목록 조회가 완료되었습니다.',
  },
  BLOG_DRAFT_DETAIL_RETRIEVED: {
    status: HttpStatus.OK,
    code: 'BLOG200-2',
    message: 'AI 블로그 초안 상세 조회가 완료되었습니다.',
  },
  BLOG_DRAFT_DELETED: {
    status: HttpStatus.OK,
    code: 'BLOG200-3',
    message: 'AI 블로그 초안이 삭제되었습니다.',
  },
  BLOG_DRAFT_USAGE_RETRIEVED: {
    status: HttpStatus.OK,
    code: 'BLOG200-4',
    message: 'AI 블로그 사용량 조회가 완료되었습니다.',
  },
} as const;

export type SuccessCodeType = (typeof SuccessCode)[keyof typeof SuccessCode];
