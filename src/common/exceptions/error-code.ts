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
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];
