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

  // User
  USER_UNAVAILABLE: {
    status: HttpStatus.FORBIDDEN,
    code: 'USER403',
    message: '이용할 수 없는 계정입니다.',
  },
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];
