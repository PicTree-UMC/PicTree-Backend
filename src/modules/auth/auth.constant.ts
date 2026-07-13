export const AuthEnv = {
  ACCESS_TOKEN_SECRET: 'JWT_ACCESS_TOKEN_SECRET',
  REFRESH_TOKEN_SECRET: 'JWT_REFRESH_TOKEN_SECRET',
  ACCESS_TOKEN_EXPIRES_IN: 'JWT_ACCESS_TOKEN_EXPIRES_IN',
  REFRESH_TOKEN_EXPIRES_IN: 'JWT_REFRESH_TOKEN_EXPIRES_IN',
  KAKAO_CLIENT_ID: 'KAKAO_CLIENT_ID',
  KAKAO_CLIENT_SECRET: 'KAKAO_CLIENT_SECRET',
  GOOGLE_CLIENT_ID: 'GOOGLE_CLIENT_ID',
  GOOGLE_CLIENT_SECRET: 'GOOGLE_CLIENT_SECRET',
} as const;

export const AuthTokenExpiresIn = {
  ACCESS_TOKEN_SECONDS: 60 * 60,
  REFRESH_TOKEN_SECONDS: 60 * 60 * 24 * 14,
} as const;

export const AuthCookie = {
  REFRESH_TOKEN: 'refreshToken',
  PATH: '/api/v1/auth',
} as const;

export const AuthEndpoint = {
  KAKAO_TOKEN: 'https://kauth.kakao.com/oauth/token',
  KAKAO_USER_INFO: 'https://kapi.kakao.com/v2/user/me',
  GOOGLE_TOKEN: 'https://oauth2.googleapis.com/token',
  GOOGLE_USER_INFO: 'https://openidconnect.googleapis.com/v1/userinfo',
} as const;

export const AuthProviderRequest = {
  TIMEOUT_MS: 5000,
} as const;
