export const AuthEnv = {
  ACCESS_TOKEN_SECRET: 'JWT_ACCESS_TOKEN_SECRET',
  REFRESH_TOKEN_SECRET: 'JWT_REFRESH_TOKEN_SECRET',
  ACCESS_TOKEN_EXPIRES_IN: 'JWT_ACCESS_TOKEN_EXPIRES_IN',
  REFRESH_TOKEN_EXPIRES_IN: 'JWT_REFRESH_TOKEN_EXPIRES_IN',
} as const;

export const AuthTokenExpiresIn = {
  ACCESS_TOKEN_SECONDS: 60 * 60,
  REFRESH_TOKEN_SECONDS: 60 * 60 * 24 * 14,
} as const;

export const AuthCookie = {
  REFRESH_TOKEN: 'refreshToken',
  PATH: '/api/v1/auth',
} as const;
