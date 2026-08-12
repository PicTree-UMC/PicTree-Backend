import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code';
import { AuthRepository } from './auth.repository';
import { AuthSocialService } from './auth-social.service';
import { AuthTokenService } from './auth-token.service';
import { AuthUserResponseDto } from './dto/auth-user-response.dto';
import { SocialLoginRequestDto } from './dto/social-login-request.dto';
import { TokenRefreshResponseDto } from './dto/token-refresh-response.dto';
import {
  AuthUserRecord,
  ResolvedSocialUser,
  SocialLoginResult,
  SocialUserInfo,
} from './auth.types';
import { UserStatus } from '../users/users.constant';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly authSocialService: AuthSocialService,
    private readonly authTokenService: AuthTokenService,
  ) {}

  socialLogin = async (
    socialLoginRequestDto: SocialLoginRequestDto,
  ): Promise<SocialLoginResult> => {
    const socialUserInfo = await this.authSocialService.getSocialUserInfo(
      socialLoginRequestDto,
    );
    const socialAccount = await this.authRepository.findSocialAccountWithUser(
      socialUserInfo.provider,
      socialUserInfo.providerUserId,
    );
    const socialUserResult = socialAccount
      ? await this.resolveExistingSocialAccount(
          socialAccount.user,
          socialUserInfo,
        )
      : await this.createSocialUser(socialUserInfo);
    const { user, isNewUser } = socialUserResult;

    this.validateAvailableUser(user);

    const tokens = await this.authTokenService.issueTokens({
      userId: Number(user.id),
      role: user.role,
      tokenVersion: user.tokenVersion,
    });

    return {
      isNewUser,
      isRecovered: socialUserResult.isRecovered,
      needTermsAgreement: isNewUser,
      needProfileSetup: !socialUserInfo.nickname,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: this.toAuthUserResponseDto(user),
    };
  };

  refreshToken = async (
    refreshToken?: string,
  ): Promise<TokenRefreshResponseDto> => {
    if (!refreshToken) {
      throw new AppException(ErrorCode.AUTH_INVALID_REFRESH_TOKEN);
    }

    const payload =
      await this.authTokenService.verifyRefreshToken(refreshToken);
    const user = await this.authRepository.findUserById(payload.userId);

    if (!user) {
      throw new AppException(ErrorCode.AUTH_INVALID_REFRESH_TOKEN);
    }

    this.validateAvailableUser(user);
    this.validateRefreshTokenVersion(user, payload);

    return this.authTokenService.issueAccessToken({
      userId: Number(user.id),
      role: user.role,
      tokenVersion: user.tokenVersion,
    });
  };

  logout = (): Promise<null> => {
    return Promise.resolve(null);
  };

  private validateAvailableUser = (user: AuthUserRecord): void => {
    if (user.status !== UserStatus.ACTIVE) {
      throw new AppException(ErrorCode.USER_UNAVAILABLE);
    }
  };

  private validateRefreshTokenVersion = (
    user: AuthUserRecord,
    payload: { tokenVersion?: number },
  ): void => {
    if ((payload.tokenVersion ?? 0) !== user.tokenVersion) {
      throw new AppException(ErrorCode.AUTH_INVALID_REFRESH_TOKEN);
    }
  };

  private resolveExistingSocialAccount = async (
    user: AuthUserRecord,
    socialUserInfo: SocialUserInfo,
  ): Promise<ResolvedSocialUser> => {
    if (user.status !== UserStatus.WITHDRAWN) {
      return { user, isNewUser: false, isRecovered: false };
    }

    const now = new Date();
    const recoveredUser = await this.authRepository.recoverWithdrawnUser(
      user.id,
      now,
    );

    if (recoveredUser) {
      return { user: recoveredUser, isNewUser: false, isRecovered: true };
    }

    await this.authRepository.finalizeExpiredWithdrawnUser(user.id, now);

    return this.createSocialUser(socialUserInfo);
  };

  private createSocialUser = (
    socialUserInfo: SocialUserInfo,
  ): Promise<ResolvedSocialUser> => {
    return this.authRepository
      .createUserWithSocialAccount(
        socialUserInfo,
        this.createNickname(socialUserInfo),
      )
      .then((result) => ({ ...result, isRecovered: false }));
  };

  private createNickname = (socialUserInfo: SocialUserInfo): string => {
    return (
      socialUserInfo.nickname ??
      `${socialUserInfo.provider}_${socialUserInfo.providerUserId}`
    ).slice(0, 50);
  };

  private toAuthUserResponseDto = (
    user: AuthUserRecord,
  ): AuthUserResponseDto => ({
    id: Number(user.id),
    email: user.email,
    nickname: user.nickname,
    profileImageUrl: user.profileImageUrl,
    currentPlan: user.currentSubscription?.subscriptionPlan.code ?? 'FREE',
  });
}
