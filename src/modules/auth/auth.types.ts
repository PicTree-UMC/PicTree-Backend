export enum SocialProvider {
  KAKAO = 'KAKAO',
  GOOGLE = 'GOOGLE',
}

export interface JwtPayload {
  userId: number;
  role: string;
  tokenVersion?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AccessToken {
  accessToken: string;
  expiresIn: number;
}

export interface AuthUserRecord {
  id: bigint;
  email: string | null;
  nickname: string;
  profileImageUrl: string | null;
  role: string;
  status: string;
  tokenVersion: number;
  deletedAt: Date | null;
  scheduledDeletionAt: Date | null;
  currentSubscription: {
    subscriptionPlan: {
      code: string;
    };
  } | null;
}

export interface TokenUserRecord {
  status: string;
  tokenVersion: number;
}

export interface SocialAccountWithUser {
  id: bigint;
  userId: bigint;
  provider: string;
  providerUserId: string;
  providerEmail: string | null;
  user: AuthUserRecord;
}

export interface CreateSocialUserResult {
  user: AuthUserRecord;
  isNewUser: boolean;
}

export interface SocialLoginResult {
  isNewUser: boolean;
  isRecovered: boolean;
  needTermsAgreement: boolean;
  needProfileSetup: boolean;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: number;
    email: string | null;
    nickname: string;
    profileImageUrl: string | null;
    currentPlan: string;
  };
}

export interface RefreshTokenCookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'none';
  path: string;
  maxAge: number;
}

export interface SocialUserInfo {
  provider: SocialProvider;
  providerUserId: string;
  email: string | null;
  nickname: string | null;
  profileImageUrl: string | null;
}

export interface ResolvedSocialUser {
  user: AuthUserRecord;
  isNewUser: boolean;
  isRecovered: boolean;
}
