import { HttpStatus } from '@nestjs/common';

export const ErrorCode = {
  // Common
  INTERNAL_SERVER_ERROR: {status: HttpStatus.INTERNAL_SERVER_ERROR, code: 'COMMON500', message: '서버 내부 오류입니다.'},
  INVALID_REQUEST: {status: HttpStatus.BAD_REQUEST, code: 'COMMON400', message: '잘못된 요청입니다.'},

  
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];