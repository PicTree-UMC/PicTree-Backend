import { Logger } from '@nestjs/common';
import { SubscriptionRenewalScheduler } from './subscription-renewal.scheduler';
import { SubscriptionsService } from './subscriptions.service';

describe('SubscriptionRenewalScheduler', () => {
  let subscriptionsService: jest.Mocked<SubscriptionsService>;
  let scheduler: SubscriptionRenewalScheduler;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    subscriptionsService = {
      processDueSubscriptionRenewals: jest.fn(),
    } as unknown as jest.Mocked<SubscriptionsService>;
    scheduler = new SubscriptionRenewalScheduler(subscriptionsService);
  });

  afterEach(async () => {
    await scheduler.onModuleDestroy();
    jest.restoreAllMocks();
  });

  it('만료된 구독 자동갱신 작업을 실행한다', async () => {
    subscriptionsService.processDueSubscriptionRenewals.mockResolvedValue(2);

    await scheduler.runRenewals();

    expect(
      subscriptionsService.processDueSubscriptionRenewals,
    ).toHaveBeenCalledTimes(1);
  });

  it('갱신 작업이 실행 중이면 중복 실행하지 않는다', async () => {
    let resolveRenewals: (count: number) => void = () => undefined;
    subscriptionsService.processDueSubscriptionRenewals.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRenewals = resolve;
        }),
    );

    const currentRun = scheduler.runRenewals();
    await scheduler.runRenewals();

    expect(
      subscriptionsService.processDueSubscriptionRenewals,
    ).toHaveBeenCalledTimes(1);

    resolveRenewals(0);
    await currentRun;
  });

  it('서비스 종료 시 진행 중인 갱신 작업이 끝날 때까지 기다린다', async () => {
    let resolveRenewals: (count: number) => void = () => undefined;
    subscriptionsService.processDueSubscriptionRenewals.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRenewals = resolve;
        }),
    );
    void scheduler.runRenewals();

    let destroyed = false;
    const destroyPromise = scheduler.onModuleDestroy().then(() => {
      destroyed = true;
    });
    await Promise.resolve();

    expect(destroyed).toBe(false);

    resolveRenewals(0);
    await destroyPromise;
    expect(destroyed).toBe(true);
  });
});
