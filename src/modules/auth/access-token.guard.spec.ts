import { ExecutionContext } from '@nestjs/common';
import { AccessTokenGuard } from './access-token.guard';
import { AuthRepository } from './auth.repository';
import { AuthTokenService } from './auth-token.service';

describe('AccessTokenGuard', () => {
  let authTokenService: jest.Mocked<AuthTokenService>;
  let authRepository: jest.Mocked<AuthRepository>;
  let guard: AccessTokenGuard;

  beforeEach(() => {
    authTokenService = {
      verifyAccessToken: jest.fn(),
    } as unknown as jest.Mocked<AuthTokenService>;
    authRepository = {
      findTokenUserById: jest.fn(),
    } as unknown as jest.Mocked<AuthRepository>;
    guard = new AccessTokenGuard(authTokenService, authRepository);
  });

  it('현재 토큰 버전과 일치하는 Access Token을 허용한다', async () => {
    const request = { headers: { authorization: 'Bearer access-token' } };
    authTokenService.verifyAccessToken.mockResolvedValue({
      userId: 1,
      role: 'USER',
      tokenVersion: 2,
    });
    authRepository.findTokenUserById.mockResolvedValue({
      status: 'ACTIVE',
      tokenVersion: 2,
    });

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request).toMatchObject({
      user: { userId: 1, tokenVersion: 2 },
    });
  });

  it('탈퇴 전 토큰 버전이면 Access Token을 거부한다', async () => {
    const request = { headers: { authorization: 'Bearer old-token' } };
    authTokenService.verifyAccessToken.mockResolvedValue({
      userId: 1,
      role: 'USER',
      tokenVersion: 0,
    });
    authRepository.findTokenUserById.mockResolvedValue({
      status: 'ACTIVE',
      tokenVersion: 2,
    });

    await expect(
      guard.canActivate(createContext(request)),
    ).rejects.toMatchObject({
      response: { code: 'AUTH401' },
    });
  });

  it('토큰의 사용자가 존재하지 않으면 Access Token을 거부한다', async () => {
    const request = { headers: { authorization: 'Bearer access-token' } };
    authTokenService.verifyAccessToken.mockResolvedValue({
      userId: 1,
      role: 'USER',
      tokenVersion: 0,
    });
    authRepository.findTokenUserById.mockResolvedValue(null);

    await expect(
      guard.canActivate(createContext(request)),
    ).rejects.toMatchObject({
      response: { code: 'AUTH401' },
    });
  });

  it('토큰 버전이 같아도 탈퇴 상태이면 사용자를 거부한다', async () => {
    const request = { headers: { authorization: 'Bearer access-token' } };
    authTokenService.verifyAccessToken.mockResolvedValue({
      userId: 1,
      role: 'USER',
      tokenVersion: 1,
    });
    authRepository.findTokenUserById.mockResolvedValue({
      status: 'WITHDRAWN',
      tokenVersion: 1,
    });

    await expect(
      guard.canActivate(createContext(request)),
    ).rejects.toMatchObject({
      response: { code: 'USER403' },
    });
  });
});

const createContext = (request: object): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
  }) as ExecutionContext;
