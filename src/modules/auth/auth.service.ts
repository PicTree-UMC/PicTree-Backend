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
  SocialLoginResult,
  SocialUserInfo,
} from './auth.types';

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
    const isNewUser = !socialAccount;
    const user =
      socialAccount?.user ??
      (await this.authRepository.createUserWithSocialAccount(
        socialUserInfo,
        this.createNickname(socialUserInfo),
      ));

    this.validateAvailableUser(user);

    const tokens = await this.authTokenService.issueTokens({
      userId: Number(user.id),
      role: user.role,
    });

    return {
      isNewUser,
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

    return this.authTokenService.issueAccessToken({
      userId: Number(user.id),
      role: user.role,
    });
  };

  logout = (): Promise<null> => {
    return Promise.resolve(null);
  };

  private validateAvailableUser = (user: AuthUserRecord): void => {
    if (user.status !== 'ACTIVE') {
      throw new AppException(ErrorCode.USER_UNAVAILABLE);
    }
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
    currentPlan: user.currentPlan,
  });
}
