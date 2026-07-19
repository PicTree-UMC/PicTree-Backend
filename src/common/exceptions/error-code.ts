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
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];
