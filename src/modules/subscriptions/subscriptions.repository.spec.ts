import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionBillingCycle } from './subscriptions.constant';
import { SubscriptionsRepository } from './subscriptions.repository';
import { SubscriptionRecord } from './subscriptions.types';

describe('SubscriptionsRepository', () => {
  let subscriptionsRepository: SubscriptionsRepository;
  let prisma: { $transaction: jest.Mock };
  let tx: {
    $queryRaw: jest.Mock;
    user: { findUnique: jest.Mock };
    userSubscription: {
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    tx = {
      $queryRaw: jest.fn(),
      user: { findUnique: jest.fn() },
      userSubscription: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    subscriptionsRepository = new SubscriptionsRepository(
      prisma as unknown as PrismaService,
    );
    tx.user.findUnique.mockResolvedValue({ currentSubscriptionId: 1n });
  });

  it('사용자 행을 잠그고 구독 자동갱신을 해지한다', async () => {
    const changedAt = new Date('2026-02-01T10:00:00.000Z');
    const subscription = createSubscriptionRecord();
    const canceledSubscription = createSubscriptionRecord({
      autoRenew: false,
      canceledAt: changedAt,
    });

    tx.userSubscription.findFirst.mockResolvedValue(subscription);
    tx.userSubscription.update.mockResolvedValue(canceledSubscription);

    const result = await subscriptionsRepository.updateSubscriptionAutoRenewal({
      userId: 1,
      subscriptionId: 1,
      autoRenew: false,
      changedAt,
    });

    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.userSubscription.update).toHaveBeenCalledWith({
      where: { id: 1n },
      data: { autoRenew: false, canceledAt: changedAt },
      include: { subscriptionPlan: true },
    });
    expect(result.subscription).toBe(canceledSubscription);
  });

  it('이미 해지된 구독은 다시 수정하지 않는다', async () => {
    const subscription = createSubscriptionRecord({
      autoRenew: false,
      canceledAt: new Date('2026-02-01T10:00:00.000Z'),
    });

    tx.userSubscription.findFirst.mockResolvedValue(subscription);

    const result = await subscriptionsRepository.updateSubscriptionAutoRenewal({
      userId: 1,
      subscriptionId: 1,
      autoRenew: false,
      changedAt: new Date('2026-02-02T10:00:00.000Z'),
    });

    expect(tx.userSubscription.update).not.toHaveBeenCalled();
    expect(result.subscription).toBe(subscription);
  });

  it('해지 예정 구독의 자동갱신을 재개한다', async () => {
    const subscription = createSubscriptionRecord({
      autoRenew: false,
      canceledAt: new Date('2026-02-01T10:00:00.000Z'),
    });
    const resumedSubscription = createSubscriptionRecord();

    tx.userSubscription.findFirst.mockResolvedValue(subscription);
    tx.userSubscription.update.mockResolvedValue(resumedSubscription);

    await subscriptionsRepository.updateSubscriptionAutoRenewal({
      userId: 1,
      subscriptionId: 1,
      autoRenew: true,
      changedAt: new Date('2026-02-02T10:00:00.000Z'),
    });

    expect(tx.userSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { autoRenew: true, canceledAt: null },
      }),
    );
  });

  it('현재 구독이 아니면 상태를 변경하지 않는다', async () => {
    tx.user.findUnique.mockResolvedValue({ currentSubscriptionId: 2n });
    tx.userSubscription.findFirst.mockResolvedValue(createSubscriptionRecord());

    const result = await subscriptionsRepository.updateSubscriptionAutoRenewal({
      userId: 1,
      subscriptionId: 1,
      autoRenew: false,
      changedAt: new Date('2026-02-01T10:00:00.000Z'),
    });

    expect(tx.userSubscription.update).not.toHaveBeenCalled();
    expect(result.isCurrent).toBe(false);
  });

  it('다른 사용자 소유의 구독은 찾지 못한 것으로 처리한다', async () => {
    tx.userSubscription.findFirst.mockResolvedValue(null);

    const result = await subscriptionsRepository.updateSubscriptionAutoRenewal({
      userId: 1,
      subscriptionId: 99,
      autoRenew: false,
      changedAt: new Date('2026-02-01T10:00:00.000Z'),
    });

    expect(tx.userSubscription.findFirst).toHaveBeenCalledWith({
      where: {
        id: 99n,
        userId: 1n,
      },
      include: { subscriptionPlan: true },
    });
    expect(result).toEqual({
      subscription: null,
      isCurrent: false,
      isExpired: false,
    });
    expect(tx.userSubscription.update).not.toHaveBeenCalled();
  });
});

function createSubscriptionRecord(
  overrides: Partial<SubscriptionRecord> = {},
): SubscriptionRecord {
  return {
    id: 1n,
    userId: 1n,
    subscriptionPlanId: 2n,
    startedAt: new Date('2026-01-31T10:00:00.000Z'),
    expiresAt: new Date('2026-02-28T10:00:00.000Z'),
    canceledAt: null,
    autoRenew: true,
    createdAt: new Date('2026-01-31T10:00:00.000Z'),
    updatedAt: new Date('2026-01-31T10:00:00.000Z'),
    subscriptionPlan: {
      id: 2n,
      code: 'PLUS',
      name: '플러스',
      price: 2900,
      billingCycle: SubscriptionBillingCycle.MONTHLY,
      description: null,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
    ...overrides,
  };
}
