import { HttpStatus } from '@nestjs/common';

export const SuccessCode = {
  // Common
  OK: {status: HttpStatus.OK, code: 'COMMON200', message: '요청이 성공했습니다.'},
  CREATED: {status: HttpStatus.CREATED, code: 'COMMON201', message: '생성되었습니다.'},

  
} as const;

export type SuccessCodeType = (typeof SuccessCode)[keyof typeof SuccessCode];