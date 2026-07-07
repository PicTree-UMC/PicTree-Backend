import { HttpException } from '@nestjs/common';
import { ErrorCodeType } from './error-code';

export class AppException extends HttpException {
  constructor(error: ErrorCodeType) {
    super(
      {
        success: false,
        code: error.code,
        message: error.message,
      },
      error.status,
    );
  }
}