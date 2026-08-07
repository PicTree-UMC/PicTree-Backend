import { Logger } from '@nestjs/common';
import { AuthRepository } from '../auth/auth.repository';
import { AccountRecoveryPolicy } from './users.constant';
import { WithdrawnAccountCleanupService } from './withdrawn-account-cleanup.service';

describe('WithdrawnAccountCleanupService', () => {
  let authRepository: jest.Mocked<AuthRepository>;
  let service: WithdrawnAccountCleanupService;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    authRepository = {
      findExpiredWithdrawnUserIds: jest.fn(),
      finalizeExpiredWithdrawnUser: jest.fn(),
    } as unknown as jest.Mocked<AuthRepository>;
    service = new WithdrawnAccountCleanupService(authRepository);
  });

  afterEach(() => {
    service.onModuleDestroy();
    jest.restoreAllMocks();
  });

  it('복구 기간이 지난 탈퇴 계정을 최종 정리한다', async () => {
    authRepository.findExpiredWithdrawnUserIds.mockResolvedValue([1n, 2n]);
    authRepository.finalizeExpiredWithdrawnUser.mockResolvedValue(true);

    const result = await service.cleanupExpiredWithdrawals();

    expect(result).toBe(2);
    expect(authRepository.finalizeExpiredWithdrawnUser).toHaveBeenCalledTimes(
      2,
    );
  });

  it('개별 계정 정리 실패가 다른 계정 처리를 막지 않는다', async () => {
    authRepository.findExpiredWithdrawnUserIds.mockResolvedValue([1n, 2n]);
    authRepository.finalizeExpiredWithdrawnUser
      .mockRejectedValueOnce(new Error('cleanup failed'))
      .mockResolvedValueOnce(true);

    const result = await service.cleanupExpiredWithdrawals();

    expect(result).toBe(1);
    expect(authRepository.finalizeExpiredWithdrawnUser).toHaveBeenCalledTimes(
      2,
    );
  });

  it('한 배치가 모두 실패하면 같은 계정을 무한 반복하지 않는다', async () => {
    const userIds = Array.from(
      { length: AccountRecoveryPolicy.CLEANUP_BATCH_SIZE },
      (_, index) => BigInt(index + 1),
    );
    authRepository.findExpiredWithdrawnUserIds.mockResolvedValue(userIds);
    authRepository.finalizeExpiredWithdrawnUser.mockRejectedValue(
      new Error('cleanup failed'),
    );

    const result = await service.cleanupExpiredWithdrawals();

    expect(result).toBe(0);
    expect(authRepository.findExpiredWithdrawnUserIds).toHaveBeenCalledTimes(1);
    expect(authRepository.finalizeExpiredWithdrawnUser).toHaveBeenCalledTimes(
      AccountRecoveryPolicy.CLEANUP_BATCH_SIZE,
    );
  });
});
