export class AppError extends Error {
  public readonly errorCode: string;
  public readonly statusCode: number;
  public readonly data?: any;

  constructor(params?: {
    errorCode: string;
    message: string;
    statusCode: number;
    data?: any;
  }) {
    super(params?.message ?? "Unknown error");

    this.name = "AppError";
    this.errorCode = params?.errorCode ?? "UNKNOWN";
    this.statusCode = params?.statusCode ?? 500;
    this.data = params?.data ?? null;

    Error.captureStackTrace(this, this.constructor);
  }
}