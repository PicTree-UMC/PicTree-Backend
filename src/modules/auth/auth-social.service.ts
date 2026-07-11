import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code';
import { AuthEndpoint, AuthEnv } from './auth.constant';
import { SocialLoginRequestDto } from './dto/social-login-request.dto';
import { SocialProvider, SocialUserInfo } from './auth.types';

interface KakaoTokenResponse {
  access_token?: string;
}

interface KakaoUserResponse {
  id?: number;
  kakao_account?: {
    email?: string;
    profile?: {
      nickname?: string;
      profile_image_url?: string;
    };
  };
}

interface GoogleTokenResponse {
  access_token?: string;
}

interface GoogleUserResponse {
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
}

@Injectable()
export class AuthSocialService {
  constructor(private readonly configService: ConfigService) {}

  getSocialUserInfo = async (
    socialLoginRequestDto: SocialLoginRequestDto,
  ): Promise<SocialUserInfo> => {
    const { provider, authorizationCode, redirectUri } = socialLoginRequestDto;

    switch (provider) {
      case SocialProvider.KAKAO:
        return this.getKakaoUserInfo(authorizationCode, redirectUri);
      case SocialProvider.GOOGLE:
        return this.getGoogleUserInfo(authorizationCode, redirectUri);
      default:
        throw new AppException(ErrorCode.AUTH_INVALID_SOCIAL_LOGIN_REQUEST);
    }
  };

  private getKakaoUserInfo = async (
    authorizationCode: string,
    redirectUri: string,
  ): Promise<SocialUserInfo> => {
    const { access_token: accessToken } =
      await this.postForm<KakaoTokenResponse>(
        AuthEndpoint.KAKAO_TOKEN,
        this.createKakaoTokenBody(authorizationCode, redirectUri),
      );

    if (!accessToken) {
      throw new AppException(ErrorCode.AUTH_SOCIAL_AUTHENTICATION_FAILED);
    }

    const kakaoUser = await this.getWithBearer<KakaoUserResponse>(
      AuthEndpoint.KAKAO_USER_INFO,
      accessToken,
    );

    if (!kakaoUser.id) {
      throw new AppException(ErrorCode.AUTH_SOCIAL_USER_INFO_FAILED);
    }

    return {
      provider: SocialProvider.KAKAO,
      providerUserId: String(kakaoUser.id),
      email: kakaoUser.kakao_account?.email ?? null,
      nickname: kakaoUser.kakao_account?.profile?.nickname ?? null,
      profileImageUrl:
        kakaoUser.kakao_account?.profile?.profile_image_url ?? null,
    };
  };

  private getGoogleUserInfo = async (
    authorizationCode: string,
    redirectUri: string,
  ): Promise<SocialUserInfo> => {
    const { access_token: accessToken } =
      await this.postForm<GoogleTokenResponse>(
        AuthEndpoint.GOOGLE_TOKEN,
        this.createGoogleTokenBody(authorizationCode, redirectUri),
      );

    if (!accessToken) {
      throw new AppException(ErrorCode.AUTH_SOCIAL_AUTHENTICATION_FAILED);
    }

    const googleUser = await this.getWithBearer<GoogleUserResponse>(
      AuthEndpoint.GOOGLE_USER_INFO,
      accessToken,
    );

    if (!googleUser.sub) {
      throw new AppException(ErrorCode.AUTH_SOCIAL_USER_INFO_FAILED);
    }

    return {
      provider: SocialProvider.GOOGLE,
      providerUserId: googleUser.sub,
      email: googleUser.email ?? null,
      nickname: googleUser.name ?? null,
      profileImageUrl: googleUser.picture ?? null,
    };
  };

  private createKakaoTokenBody = (
    authorizationCode: string,
    redirectUri: string,
  ): URLSearchParams => {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.getRequiredEnv(AuthEnv.KAKAO_CLIENT_ID),
      redirect_uri: redirectUri,
      code: authorizationCode,
    });
    const clientSecret = this.configService.get<string>(
      AuthEnv.KAKAO_CLIENT_SECRET,
    );

    if (clientSecret) {
      body.append('client_secret', clientSecret);
    }

    return body;
  };

  private createGoogleTokenBody = (
    authorizationCode: string,
    redirectUri: string,
  ): URLSearchParams => {
    return new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.getRequiredEnv(AuthEnv.GOOGLE_CLIENT_ID),
      client_secret: this.getRequiredEnv(AuthEnv.GOOGLE_CLIENT_SECRET),
      redirect_uri: redirectUri,
      code: authorizationCode,
    });
  };

  private postForm = async <T>(
    url: string,
    body: URLSearchParams,
  ): Promise<T> => {
    const response = await this.fetchFromProvider(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
      body,
    });

    return this.parseProviderResponse<T>(response);
  };

  private getWithBearer = async <T>(
    url: string,
    accessToken: string,
  ): Promise<T> => {
    const response = await this.fetchFromProvider(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return this.parseProviderResponse<T>(response);
  };

  private fetchFromProvider = async (
    url: string,
    init: RequestInit,
  ): Promise<Response> => {
    try {
      return await fetch(url, init);
    } catch {
      throw new AppException(ErrorCode.AUTH_SOCIAL_PROVIDER_REQUEST_FAILED);
    }
  };

  private parseProviderResponse = async <T>(response: Response): Promise<T> => {
    if (!response.ok) {
      throw new AppException(ErrorCode.AUTH_SOCIAL_AUTHENTICATION_FAILED);
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new AppException(ErrorCode.AUTH_SOCIAL_PROVIDER_REQUEST_FAILED);
    }
  };

  private getRequiredEnv = (key: string): string => {
    const value = this.configService.get<string>(key);

    if (!value) {
      throw new AppException(ErrorCode.AUTH_SOCIAL_CONFIG_MISSING);
    }

    return value;
  };
}
