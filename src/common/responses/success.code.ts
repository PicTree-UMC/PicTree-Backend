export const SuccessCode = {
  // App
  OK: { code: "COMMON000", message: "요청이 성공했습니다.", statusCode: 200 },

//   // User 예시
//   USER_CREATED: { code: "U000", message: "회원가입이 완료되었습니다.", statusCode: 201 },
//   USER_LOGIN: { code: "U001", message: "로그인이 완료되었습니다.", statusCode: 200 },

} as const;

export type SuccessCodeType = typeof SuccessCode[keyof typeof SuccessCode];