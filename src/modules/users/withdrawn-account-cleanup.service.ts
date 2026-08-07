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

  constructor(private readonly authRepository: AuthRepository) {}

  onModuleInit = (): void => {
    void this.cleanupExpiredWithdrawals();
    this.cleanupTimer = setInterval(
      () => void this.cleanupExpiredWithdrawals(),
      AccountRecoveryPolicy.CLEANUP_INTERVAL_MS,
    );
    this.cleanupTimer.unref();
  };

  onModuleDestroy = (): void => {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  };

  cleanupExpiredWithdrawals = async (): Promise<number> => {
    if (this.isRunning) {
      return 0;
    }

    this.isRunning = true;
    let finalizedCount = 0;

    try {
      while (true) {
        const now = new Date();
        const userIds = await this.authRepository.findExpiredWithdrawnUserIds(
          now,
          AccountRecoveryPolicy.CLEANUP_BATCH_SIZE,
        );
        let finalizedInBatch = 0;

        for (const userId of userIds) {
          try {
            const finalized =
              await this.authRepository.finalizeExpiredWithdrawnUser(
                userId,
                now,
              );

            if (finalized) {
              finalizedCount += 1;
              finalizedInBatch += 1;
            }
          } catch (error) {
            this.logger.error(
              `탈퇴 계정 최종 정리에 실패했습니다. userId=${userId.toString()}`,
              error instanceof Error ? error.stack : undefined,
            );
          }
        }

        if (
          userIds.length < AccountRecoveryPolicy.CLEANUP_BATCH_SIZE ||
          finalizedInBatch === 0
        ) {
          break;
        }
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
    } finally {
      this.isRunning = false;
    }
  };
}
