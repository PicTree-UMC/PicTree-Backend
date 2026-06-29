import { AppError } from "./app.error.js";

const ErrorCode = {
  // Common
  INTERNAL_SERVER_ERROR: { code: "COMMON000", message: "서버 오류가 발생했습니다.", statusCode: 500 },
  BAD_REQUEST: { code: "COMMON001", message: "잘못된 요청입니다.", statusCode: 400 },
  UNAUTHORIZED: { code: "COMMON002", message: "인증이 필요합니다.", statusCode: 401 },
  FORBIDDEN: { code: "COMMON003", message: "접근 권한이 없습니다.", statusCode: 403 },
  NOT_FOUND: { code: "COMMON004", message: "요청한 리소스를 찾을 수 없습니다.", statusCode: 404 },

//   // User 예시
//   USER_NOT_FOUND: { code: "U001", message: "존재하지 않는 유저입니다.", statusCode: 404 },
//   DUPLICATE_EMAIL: { code: "U002", message: "이미 사용 중인 이메일입니다.", statusCode: 409 },

} as const;

export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode];