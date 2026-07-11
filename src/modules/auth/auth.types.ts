export enum SocialProvider {
  KAKAO = 'KAKAO',
  GOOGLE = 'GOOGLE',
}

export interface JwtPayload {
  userId: number;
  role: string;
}

export interface SocialUserInfo {
  provider: SocialProvider;
  providerUserId: string;
  email: string | null;
  nickname: string | null;
  profileImageUrl: string | null;
}
