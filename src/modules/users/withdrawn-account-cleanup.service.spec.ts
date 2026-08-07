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

  afterEach(async () => {
    await service.onModuleDestroy();
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

  it('한 배치가 모두 실패해도 커서 이후의 계정을 계속 처리한다', async () => {
    const firstBatchUserIds = Array.from(
      { length: AccountRecoveryPolicy.CLEANUP_BATCH_SIZE },
      (_, index) => BigInt(index + 1),
    );
    authRepository.findExpiredWithdrawnUserIds
      .mockResolvedValueOnce(firstBatchUserIds)
      .mockResolvedValueOnce([101n]);
    authRepository.finalizeExpiredWithdrawnUser.mockImplementation((userId) =>
      userId === 101n
        ? Promise.resolve(true)
        : Promise.reject(new Error('cleanup failed')),
    );

    const result = await service.cleanupExpiredWithdrawals();

    expect(result).toBe(1);
    expect(authRepository.findExpiredWithdrawnUserIds).toHaveBeenCalledTimes(2);
    expect(authRepository.findExpiredWithdrawnUserIds).toHaveBeenLastCalledWith(
      expect.any(Date),
      AccountRecoveryPolicy.CLEANUP_BATCH_SIZE,
      100n,
    );
    expect(authRepository.finalizeExpiredWithdrawnUser).toHaveBeenCalledTimes(
      AccountRecoveryPolicy.CLEANUP_BATCH_SIZE + 1,
    );
  });

  it('일부 성공한 전체 배치 뒤의 다음 배치까지 처리한다', async () => {
    const firstBatchUserIds = Array.from(
      { length: AccountRecoveryPolicy.CLEANUP_BATCH_SIZE },
      (_, index) => BigInt(index + 1),
    );
    authRepository.findExpiredWithdrawnUserIds
      .mockResolvedValueOnce(firstBatchUserIds)
      .mockResolvedValueOnce([101n, 102n]);
    authRepository.finalizeExpiredWithdrawnUser.mockResolvedValue(true);

    const result = await service.cleanupExpiredWithdrawals();

    expect(result).toBe(AccountRecoveryPolicy.CLEANUP_BATCH_SIZE + 2);
    expect(authRepository.findExpiredWithdrawnUserIds).toHaveBeenCalledTimes(2);
  });

  it('정리 작업이 실행 중이면 중복 실행하지 않는다', async () => {
    let resolveUserIds: (userIds: bigint[]) => void = () => undefined;
    authRepository.findExpiredWithdrawnUserIds.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveUserIds = resolve;
        }),
    );

    const currentRun = service.cleanupExpiredWithdrawals();
    const concurrentResult = await service.cleanupExpiredWithdrawals();

    expect(concurrentResult).toBe(0);
    expect(authRepository.findExpiredWithdrawnUserIds).toHaveBeenCalledTimes(1);

    resolveUserIds([]);
    await expect(currentRun).resolves.toBe(0);
  });

  it('서비스 종료 시 실행 중인 정리 작업이 끝날 때까지 기다린다', async () => {
    let resolveUserIds: (userIds: bigint[]) => void = () => undefined;
    authRepository.findExpiredWithdrawnUserIds.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveUserIds = resolve;
        }),
    );
    void service.cleanupExpiredWithdrawals();

    let destroyed = false;
    const destroyPromise = service.onModuleDestroy().then(() => {
      destroyed = true;
    });
    await Promise.resolve();

    expect(destroyed).toBe(false);

    resolveUserIds([]);
    await destroyPromise;
    expect(destroyed).toBe(true);
  });
});
