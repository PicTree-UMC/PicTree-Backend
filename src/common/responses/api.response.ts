import { AppError } from "../errors/app.error.js";
import { SuccessCodeType, SuccessCode } from "./success.code.js";

export type ResultType = "SUCCESS" | "ERROR";

interface ApiResponse<T> {
  resultType: ResultType;
  statusCode: number;
  code: string;
  message: string;
  data: T | null;
}

export const success = <T>(
  data: T,
  successCode: SuccessCodeType = SuccessCode.OK
): ApiResponse<T> => ({
  resultType: "SUCCESS",
  statusCode: successCode.statusCode,
  code: successCode.code,
  message: successCode.message,
  data
});

export const fail = (error: AppError): ApiResponse<null> => ({
  resultType: "ERROR",
  statusCode: error.statusCode,
  code: error.errorCode,
  message: error.message,
  data: null
});