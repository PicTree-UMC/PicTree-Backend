import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { AuthRepository } from '../auth/auth.repository';
import { AccountRecoveryPolicy } from './users.constant';

@Injectable()
export class WithdrawnAccountCleanupService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(WithdrawnAccountCleanupService.name);
  private cleanupTimer?: NodeJS.Timeout;
  private isRunning = false;
  private currentRun?: Promise<number>;

  constructor(private readonly authRepository: AuthRepository) {}

  onModuleInit = (): void => {
    void this.cleanupExpiredWithdrawals();
    this.cleanupTimer = setInterval(
      () => void this.cleanupExpiredWithdrawals(),
      AccountRecoveryPolicy.CLEANUP_INTERVAL_MS,
    );
    this.cleanupTimer.unref();
  };

  onModuleDestroy = async (): Promise<void> => {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    await this.currentRun;
  };

  cleanupExpiredWithdrawals = (): Promise<number> => {
    if (this.isRunning) {
      return Promise.resolve(0);
    }

    this.isRunning = true;
    const currentRun = this.runCleanup().finally(() => {
      this.isRunning = false;

      if (this.currentRun === currentRun) {
        this.currentRun = undefined;
      }
    });
    this.currentRun = currentRun;

    return currentRun;
  };

  private runCleanup = async (): Promise<number> => {
    let finalizedCount = 0;
    const runStartedAt = new Date();
    let afterUserId: bigint | undefined;

    try {
      while (true) {
        const userIds = await this.authRepository.findExpiredWithdrawnUserIds(
          runStartedAt,
          AccountRecoveryPolicy.CLEANUP_BATCH_SIZE,
          afterUserId,
        );

        for (const userId of userIds) {
          try {
            const finalized =
              await this.authRepository.finalizeExpiredWithdrawnUser(
                userId,
                runStartedAt,
              );

            if (finalized) {
              finalizedCount += 1;
            }
          } catch (error) {
            this.logger.error(
              `탈퇴 계정 최종 정리에 실패했습니다. userId=${userId.toString()}`,
              error instanceof Error ? error.stack : undefined,
            );
          }
        }

        if (userIds.length < AccountRecoveryPolicy.CLEANUP_BATCH_SIZE) {
          break;
        }

        afterUserId = userIds[userIds.length - 1];
      }

      if (finalizedCount > 0) {
        this.logger.log(`탈퇴 계정 ${finalizedCount}건을 최종 정리했습니다.`);
      }

      return finalizedCount;
    } catch (error) {
      this.logger.error(
        '탈퇴 계정 정리 배치를 실행하지 못했습니다.',
        error instanceof Error ? error.stack : undefined,
      );
      return finalizedCount;
    }
  };
}
