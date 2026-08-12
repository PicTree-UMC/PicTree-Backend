import { HttpStatus } from '@nestjs/common';

export const ErrorCode = {
  // Common
  INTERNAL_SERVER_ERROR: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    code: 'COMMON500',
    message: '서버 내부 오류입니다.',
  },
  INVALID_REQUEST: {
    status: HttpStatus.BAD_REQUEST,
    code: 'COMMON400',
    message: '잘못된 요청입니다.',
  },

  // Auth
  AUTH_NOT_IMPLEMENTED: {
    status: HttpStatus.NOT_IMPLEMENTED,
    code: 'AUTH501',
    message: '인증 API가 아직 구현되지 않았습니다.',
  },
  AUTH_TOKEN_SECRET_MISSING: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    code: 'AUTH500',
    message: 'JWT Secret 설정이 누락되었습니다.',
  },
  AUTH_INVALID_TOKEN_EXPIRES_IN: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    code: 'AUTH500',
    message: 'JWT 만료 시간 설정이 올바르지 않습니다.',
  },
  AUTH_INVALID_SOCIAL_LOGIN_REQUEST: {
    status: HttpStatus.BAD_REQUEST,
    code: 'AUTH400',
    message: '소셜 로그인 요청 값이 올바르지 않습니다.',
  },
  AUTH_SOCIAL_AUTHENTICATION_FAILED: {
    status: HttpStatus.UNAUTHORIZED,
    code: 'AUTH401',
    message: '소셜 인증에 실패했습니다.',
  },
  AUTH_SOCIAL_PROVIDER_REQUEST_FAILED: {
    status: HttpStatus.BAD_GATEWAY,
    code: 'AUTH502',
    message: '소셜 로그인 제공자와 통신하는 중 오류가 발생했습니다.',
  },
  AUTH_SOCIAL_USER_INFO_FAILED: {
    status: HttpStatus.BAD_GATEWAY,
    code: 'AUTH502',
    message: '소셜 사용자 정보를 조회하지 못했습니다.',
  },
  AUTH_SOCIAL_CONFIG_MISSING: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    code: 'AUTH500',
    message: '소셜 로그인 설정이 누락되었습니다.',
  },
  AUTH_INVALID_REFRESH_TOKEN: {
    status: HttpStatus.UNAUTHORIZED,
    code: 'AUTH401',
    message: '유효하지 않은 Refresh Token입니다.',
  },
  AUTH_INVALID_ACCESS_TOKEN: {
    status: HttpStatus.UNAUTHORIZED,
    code: 'AUTH401',
    message: '유효하지 않은 Access Token입니다.',
  },

  // User
  USER_INVALID_UPDATE_REQUEST: {
    status: HttpStatus.BAD_REQUEST,
    code: 'USER400',
    message: '회원 수정 요청 값이 올바르지 않습니다.',
  },
  USER_UNAVAILABLE: {
    status: HttpStatus.FORBIDDEN,
    code: 'USER403',
    message: '이용할 수 없는 계정입니다.',
  },
  USER_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    code: 'USER404',
    message: '사용자를 찾을 수 없습니다.',
  },
  USER_ALREADY_WITHDRAWN: {
    status: HttpStatus.CONFLICT,
    code: 'USER409',
    message: '이미 탈퇴한 회원입니다.',
  },

  // Terms
  TERMS_INVALID_AGREEMENT_REQUEST: {
    status: HttpStatus.BAD_REQUEST,
    code: 'TERMS400',
    message: '약관 동의 요청 값이 올바르지 않습니다.',
  },
  TERMS_REQUIRED_AGREEMENT_MISSING: {
    status: HttpStatus.BAD_REQUEST,
    code: 'TERMS400',
    message: '필수 약관에 모두 동의해야 합니다.',
  },
  TERMS_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    code: 'TERMS404',
    message: '약관을 찾을 수 없습니다.',
  },

  // Payment
  PAYMENT_SUBSCRIPTION_PLAN_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    code: 'PAYMENT404',
    message: '구독 요금제를 찾을 수 없습니다.',
  },
  PAYMENT_CONFIG_MISSING: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    code: 'PAYMENT500',
    message: '결제 설정이 누락되었습니다.',
  },
  PAYMENT_PROVIDER_REQUEST_FAILED: {
    status: HttpStatus.BAD_GATEWAY,
    code: 'PAYMENT502',
    message: '결제 제공자와 통신하는 중 오류가 발생했습니다.',
  },
  PAYMENT_ORDER_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    code: 'PAYMENT404',
    message: '결제 주문을 찾을 수 없습니다.',
  },
  PAYMENT_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    code: 'PAYMENT404',
    message: '결제 내역을 찾을 수 없습니다.',
  },
  PAYMENT_AMOUNT_MISMATCH: {
    status: HttpStatus.BAD_REQUEST,
    code: 'PAYMENT400',
    message: '결제 금액이 주문 금액과 일치하지 않습니다.',
  },
  PAYMENT_INVALID_STATUS: {
    status: HttpStatus.CONFLICT,
    code: 'PAYMENT409',
    message: '결제를 승인할 수 없는 상태입니다.',
  },
  PAYMENT_CANCEL_NOT_ALLOWED: {
    status: HttpStatus.CONFLICT,
    code: 'PAYMENT409',
    message: '취소할 수 없는 결제 상태입니다.',
  },
  PAYMENT_WEBHOOK_INVALID: {
    status: HttpStatus.BAD_REQUEST,
    code: 'PAYMENT400',
    message: '결제 웹훅 요청이 올바르지 않습니다.',
  },
  PAYMENT_WEBHOOK_PROCESSING_FAILED: {
    status: HttpStatus.BAD_GATEWAY,
    code: 'PAYMENT502',
    message: '결제 웹훅을 처리하지 못했습니다.',
  },

  // Billing Key
  BILLING_KEY_INVALID_CUSTOMER_KEY: {
    status: HttpStatus.BAD_REQUEST,
    code: 'BILLING_KEY400',
    message: 'customerKey가 유효하지 않습니다.',
  },
  BILLING_KEY_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    code: 'BILLING_KEY404',
    message: '자동결제 수단을 찾을 수 없습니다.',
  },
  BILLING_KEY_CONFIG_MISSING: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    code: 'BILLING_KEY500',
    message: '자동결제 설정이 누락되었습니다.',
  },
  BILLING_KEY_PROVIDER_REQUEST_FAILED: {
    status: HttpStatus.BAD_GATEWAY,
    code: 'BILLING_KEY502',
    message: '결제 제공자와 통신하는 중 오류가 발생했습니다.',
  },

  // Subscription
  SUBSCRIPTION_PLAN_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    code: 'SUBSCRIPTION404',
    message: '구독 요금제를 찾을 수 없습니다.',
  },
  SUBSCRIPTION_PLAN_NOT_SUBSCRIBABLE: {
    status: HttpStatus.BAD_REQUEST,
    code: 'SUBSCRIPTION400',
    message: '구독할 수 없는 요금제입니다.',
  },
  SUBSCRIPTION_BILLING_KEY_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    code: 'SUBSCRIPTION404',
    message: '사용 가능한 자동결제 수단을 찾을 수 없습니다.',
  },
  SUBSCRIPTION_ALREADY_ACTIVE: {
    status: HttpStatus.CONFLICT,
    code: 'SUBSCRIPTION409',
    message: '이미 이용 중인 구독이 있습니다.',
  },
  SUBSCRIPTION_PAYMENT_IN_PROGRESS: {
    status: HttpStatus.CONFLICT,
    code: 'SUBSCRIPTION409',
    message: '구독 결제가 진행 중입니다.',
  },
  SUBSCRIPTION_PAYMENT_FAILED: {
    status: HttpStatus.BAD_GATEWAY,
    code: 'SUBSCRIPTION502',
    message: '구독 결제를 완료하지 못했습니다.',
  },
  SUBSCRIPTION_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    code: 'SUBSCRIPTION404',
    message: '구독을 찾을 수 없습니다.',
  },
  SUBSCRIPTION_CANCEL_NOT_ALLOWED: {
    status: HttpStatus.CONFLICT,
    code: 'SUBSCRIPTION409',
    message: '해지할 수 없는 구독입니다.',
  },
  SUBSCRIPTION_RESUME_NOT_ALLOWED: {
    status: HttpStatus.CONFLICT,
    code: 'SUBSCRIPTION409',
    message: '자동갱신을 재개할 수 없는 구독입니다.',
  },
  SUBSCRIPTION_PLAN_CHANGE_NOT_ALLOWED: {
    status: HttpStatus.CONFLICT,
    code: 'SUBSCRIPTION409',
    message: '플랜을 변경할 수 없는 구독입니다.',
  },

  // Blog Draft
  BLOG_DRAFT_INVALID_REQUEST: {
    status: HttpStatus.BAD_REQUEST,
    code: 'BLOG400-1',
    message: 'AI 블로그 초안 요청 값이 올바르지 않습니다.',
  },
  BLOG_DRAFT_SOURCE_EMPTY: {
    status: HttpStatus.BAD_REQUEST,
    code: 'BLOG400-2',
    message: '선택한 기간에 블로그 초안을 생성할 데이터가 없습니다.',
  },
  BLOG_DRAFT_EMPTY_CONTENT: {
    status: HttpStatus.BAD_REQUEST,
    code: 'BLOG400-3',
    message: '저장할 AI 블로그 초안 내용이 없습니다.',
  },
  BLOG_DRAFT_LIMIT_EXCEEDED: {
    status: HttpStatus.FORBIDDEN,
    code: 'BLOG403',
    message:
      '이번 이용 기간의 AI 블로그 초안 생성 가능 횟수를 모두 사용했습니다.',
  },
  BLOG_DRAFT_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    code: 'BLOG404',
    message: 'AI 블로그 초안을 찾을 수 없습니다.',
  },
  BLOG_DRAFT_OPENAI_CONFIG_MISSING: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    code: 'BLOG500',
    message: 'OpenAI 설정이 누락되었습니다.',
  },
  BLOG_DRAFT_GENERATION_FAILED: {
    status: HttpStatus.BAD_GATEWAY,
    code: 'BLOG502',
    message: 'AI 블로그 초안 생성에 실패했습니다.',
  },

  // Tree
  TREE_INVALID_REQUEST: {
    status: HttpStatus.BAD_REQUEST,
    code: 'TREE400',
    message: '나무 요청 값이 올바르지 않습니다.',
  },
  TREE_FORBIDDEN: {
    status: HttpStatus.FORBIDDEN,
    code: 'TREE403',
    message: '접근 권한이 없습니다.',
  },
  TREE_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    code: 'TREE404',
    message: '존재하지 않는 나무입니다.',
  },
  TREE_DAILY_LIMIT_EXCEEDED: {
    status: HttpStatus.TOO_MANY_REQUESTS,
    code: 'TREE429',
    message: '하루에 등록할 수 있는 나무 개수를 초과했습니다.',
  },

  // Route
  ROUTE_INVALID_REQUEST: {
    status: HttpStatus.BAD_REQUEST,
    code: 'ROUTE400',
    message: '동선 요청 값이 올바르지 않습니다.',
  },
  ROUTE_FORBIDDEN: {
    status: HttpStatus.FORBIDDEN,
    code: 'ROUTE403',
    message: '접근 권한이 없습니다.',
  },
  ROUTE_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    code: 'ROUTE404',
    message: '존재하지 않는 동선입니다.',
  },

  // Push Subscription
  PUSH_SUBSCRIPTION_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    code: 'PUSH_SUBSCRIPTION404',
    message: '푸시 구독을 찾을 수 없습니다.',
  },
  PUSH_SUBSCRIPTION_ENDPOINT_INVALID: {
    status: HttpStatus.BAD_REQUEST,
    code: 'PUSH_SUBSCRIPTION400',
    message: '허용되지 않은 푸시 구독 endpoint입니다.',
  },
  PUSH_CONFIG_MISSING: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    code: 'PUSH500',
    message: 'Web Push 설정이 누락되었습니다.',
  },

  // Nearby Alert
  NEARBY_ALERT_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    code: 'NEARBY_ALERT404',
    message: '근처 나무 알림 기록을 찾을 수 없습니다.',
  },

  // Tree Image
  TREE_IMAGE_NO_FILE: {
    status: HttpStatus.BAD_REQUEST,
    code: 'TREE_IMAGE400',
    message: '업로드할 이미지 파일이 없습니다.',
  },
  TREE_IMAGE_UNSUPPORTED_TYPE: {
    status: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
    code: 'TREE_IMAGE415',
    message: '지원하지 않는 이미지 형식입니다.',
  },
  TREE_IMAGE_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    code: 'TREE_IMAGE404',
    message: '존재하지 않는 사진입니다.',
  },

  // S3
  S3_CONFIG_MISSING: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    code: 'S3500',
    message: 'S3 설정이 누락되었습니다.',
  },
  S3_UPLOAD_FAILED: {
    status: HttpStatus.BAD_GATEWAY,
    code: 'S3502',
    message: '이미지 업로드에 실패했습니다.',
  },
  S3_DELETE_FAILED: {
    status: HttpStatus.BAD_GATEWAY,
    code: 'S3502',
    message: '이미지 삭제에 실패했습니다.',
  },
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];
