import { SuccessCodeType } from './success-code';

export class ApiResponse<T> {
  success: boolean;
  code: string;
  message: string;
  data: T | null;

  private constructor(
    success: boolean,
    code: string,
    message: string,
    data: T | null,
  ) {
    this.success = success;
    this.code = code;
    this.message = message;
    this.data = data;
  }

  static success<T>(
    successCode: SuccessCodeType,
    data: T | null = null,
  ): ApiResponse<T> {
    return new ApiResponse(
      true,
      successCode.code,
      successCode.message,
      data,
    );
  }
}