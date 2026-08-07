import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { SubscriptionRenewalPolicy } from './subscriptions.constant';
import { SubscriptionsService } from './subscriptions.service';

@Injectable()
export class SubscriptionRenewalScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(SubscriptionRenewalScheduler.name);
  private renewalTimer?: NodeJS.Timeout;
  private currentRun?: Promise<void>;

  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  onModuleInit = (): void => {
    void this.runRenewals();
    this.renewalTimer = setInterval(
      () => void this.runRenewals(),
      SubscriptionRenewalPolicy.INTERVAL_MS,
    );
    this.renewalTimer.unref();
  };

  onModuleDestroy = async (): Promise<void> => {
    if (this.renewalTimer) {
      clearInterval(this.renewalTimer);
    }

    await this.currentRun;
  };

  runRenewals = (): Promise<void> => {
    if (this.currentRun) {
      return Promise.resolve();
    }

    const currentRun = this.executeRenewals().finally(() => {
      if (this.currentRun === currentRun) {
        this.currentRun = undefined;
      }
    });
    this.currentRun = currentRun;

    return currentRun;
  };

  private executeRenewals = async (): Promise<void> => {
    try {
      const renewedCount =
        await this.subscriptionsService.processDueSubscriptionRenewals();

      if (renewedCount > 0) {
        this.logger.log(`구독 ${renewedCount}건을 자동갱신했습니다.`);
      }
    } catch (error) {
      this.logger.error(
        '구독 자동갱신 작업을 실행하지 못했습니다.',
        error instanceof Error ? error.stack : undefined,
      );
    }
  };
}
