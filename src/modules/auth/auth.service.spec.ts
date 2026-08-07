import { AppException } from '../../common/exceptions/app.exception';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { AuthSocialService } from './auth-social.service';
import { AuthTokenService } from './auth-token.service';
import {
  AuthUserRecord,
  SocialAccountWithUser,
  SocialProvider,
  SocialUserInfo,
} from './auth.types';

describe('AuthService', () => {
  let authRepository: jest.Mocked<AuthRepository>;
  let authSocialService: jest.Mocked<AuthSocialService>;
  let authTokenService: jest.Mocked<AuthTokenService>;
  let authService: AuthService;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-08T10:00:00.000Z'));
    authRepository = {
      findUserById: jest.fn(),
      findSocialAccountWithUser: jest.fn(),
      createUserWithSocialAccount: jest.fn(),
      recoverWithdrawnUser: jest.fn(),
      finalizeExpiredWithdrawnUser: jest.fn(),
    } as unknown as jest.Mocked<AuthRepository>;
    authSocialService = {
      getSocialUserInfo: jest.fn(),
    } as unknown as jest.Mocked<AuthSocialService>;
    authTokenService = {
      issueTokens: jest.fn().mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 3600,
      }),
      issueAccessToken: jest.fn(),
      verifyRefreshToken: jest.fn(),
    } as unknown as jest.Mocked<AuthTokenService>;
    authService = new AuthService(
      authRepository,
      authSocialService,
      authTokenService,
    );
    authSocialService.getSocialUserInfo.mockResolvedValue(socialUserInfo);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('탈퇴 후 30일 이내 로그인하면 기존 계정을 복구한다', async () => {
    const withdrawnUser = createUser({
      status: 'WITHDRAWN',
      tokenVersion: 1,
      deletedAt: new Date('2026-08-01T00:00:00.000Z'),
      scheduledDeletionAt: new Date('2026-08-31T00:00:00.000Z'),
    });
    const recoveredUser = createUser({ tokenVersion: 2 });
    authRepository.findSocialAccountWithUser.mockResolvedValue(
      createSocialAccount(withdrawnUser),
    );
    authRepository.recoverWithdrawnUser.mockResolvedValue(recoveredUser);

    const result = await authService.socialLogin(loginRequest);

    expect(result).toMatchObject({
      isNewUser: false,
      isRecovered: true,
      needTermsAgreement: false,
      user: { id: 1 },
    });
    expect(authRepository.recoverWithdrawnUser).toHaveBeenCalledWith(
      1n,
      new Date('2026-08-08T10:00:00.000Z'),
    );
    expect(authRepository.finalizeExpiredWithdrawnUser).not.toHaveBeenCalled();
    expect(authTokenService.issueTokens).toHaveBeenCalledWith({
      userId: 1,
      role: 'USER',
      tokenVersion: 2,
    });
  });

  it('복구 기간이 지나면 기존 연결을 정리하고 신규 회원을 생성한다', async () => {
    const withdrawnUser = createUser({
      status: 'WITHDRAWN',
      tokenVersion: 1,
      deletedAt: new Date('2026-07-01T00:00:00.000Z'),
      scheduledDeletionAt: new Date('2026-07-31T00:00:00.000Z'),
    });
    const newUser = createUser({ id: 2n });
    authRepository.findSocialAccountWithUser.mockResolvedValue(
      createSocialAccount(withdrawnUser),
    );
    authRepository.recoverWithdrawnUser.mockResolvedValue(null);
    authRepository.finalizeExpiredWithdrawnUser.mockResolvedValue(true);
    authRepository.createUserWithSocialAccount.mockResolvedValue({
      user: newUser,
      isNewUser: true,
    });

    const result = await authService.socialLogin(loginRequest);

    expect(authRepository.finalizeExpiredWithdrawnUser).toHaveBeenCalledWith(
      1n,
      new Date('2026-08-08T10:00:00.000Z'),
    );
    expect(authRepository.createUserWithSocialAccount).toHaveBeenCalled();
    expect(result).toMatchObject({
      isNewUser: true,
      isRecovered: false,
      needTermsAgreement: true,
      user: { id: 2 },
    });
  });

  it('탈퇴 전에 발급된 Refresh Token은 복구 후 사용할 수 없다', async () => {
    authTokenService.verifyRefreshToken.mockResolvedValue({
      userId: 1,
      role: 'USER',
      tokenVersion: 0,
    });
    authRepository.findUserById.mockResolvedValue(
      createUser({ tokenVersion: 2 }),
    );

    await expect(authService.refreshToken('old-token')).rejects.toBeInstanceOf(
      AppException,
    );
    expect(authTokenService.issueAccessToken).not.toHaveBeenCalled();
  });
});

const socialUserInfo: SocialUserInfo = {
  provider: SocialProvider.KAKAO,
  providerUserId: 'kakao-user-id',
  email: 'user@example.com',
  nickname: '사용자',
  profileImageUrl: null,
};

const loginRequest = {
  provider: SocialProvider.KAKAO,
  authorizationCode: 'authorization-code',
  redirectUri: 'http://localhost:5173/oauth/kakao/callback',
};

const createUser = (
  overrides: Partial<AuthUserRecord> = {},
): AuthUserRecord => ({
  id: 1n,
  email: 'user@example.com',
  nickname: '사용자',
  profileImageUrl: null,
  role: 'USER',
  status: 'ACTIVE',
  tokenVersion: 0,
  deletedAt: null,
  scheduledDeletionAt: null,
  currentSubscription: null,
  ...overrides,
});

const createSocialAccount = (user: AuthUserRecord): SocialAccountWithUser => ({
  id: 1n,
  userId: user.id,
  provider: SocialProvider.KAKAO,
  providerUserId: socialUserInfo.providerUserId,
  providerEmail: socialUserInfo.email,
  user,
});
