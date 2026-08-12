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
    subscriptionPlan: { findFirst: jest.Mock };
    payment: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    billingKey: { findFirst: jest.Mock };
  };

  beforeEach(() => {
    tx = {
      $queryRaw: jest.fn(),
      user: { findUnique: jest.fn() },
      userSubscription: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      subscriptionPlan: { findFirst: jest.fn() },
      payment: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      billingKey: { findFirst: jest.fn() },
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
      data: {
        autoRenew: false,
        canceledAt: changedAt,
        pendingPlanId: null,
        planChangeRequestedAt: null,
        renewalAttemptCount: 0,
        renewalRetryAt: null,
      },
      include: { subscriptionPlan: true, pendingPlan: true },
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
        data: {
          autoRenew: true,
          canceledAt: null,
          renewalAttemptCount: 0,
          renewalRetryAt: null,
        },
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
      include: { subscriptionPlan: true, pendingPlan: true },
    });
    expect(result).toEqual({
      subscription: null,
      isCurrent: false,
      isExpired: false,
    });
    expect(tx.userSubscription.update).not.toHaveBeenCalled();
  });

  it('현재 구독에 다음 플랜 변경을 예약한다', async () => {
    const changedAt = new Date('2026-02-01T10:00:00.000Z');
    const targetPlan = createSubscriptionRecord().subscriptionPlan;
    targetPlan.id = 3n;
    const scheduledSubscription = createSubscriptionRecord({
      pendingPlanId: 3n,
      pendingPlan: targetPlan,
      planChangeRequestedAt: changedAt,
    });
    tx.userSubscription.findFirst.mockResolvedValue(createSubscriptionRecord());
    tx.subscriptionPlan.findFirst.mockResolvedValue(targetPlan);
    tx.userSubscription.update.mockResolvedValue(scheduledSubscription);

    const result = await subscriptionsRepository.updatePendingPlanChange({
      userId: 1,
      subscriptionId: 1,
      pendingPlanId: 3,
      changedAt,
    });

    expect(tx.userSubscription.update).toHaveBeenCalledWith({
      where: { id: 1n },
      data: {
        pendingPlanId: 3n,
        planChangeRequestedAt: changedAt,
      },
      include: { subscriptionPlan: true, pendingPlan: true },
    });
    expect(result.subscription).toBe(scheduledSubscription);
  });

  it('예약된 플랜 변경을 취소해도 자동갱신은 유지한다', async () => {
    const subscription = createSubscriptionRecord({
      pendingPlanId: 3n,
      pendingPlan: {
        ...createSubscriptionRecord().subscriptionPlan,
        id: 3n,
      },
      planChangeRequestedAt: new Date('2026-02-01T10:00:00.000Z'),
    });
    const canceledChangeSubscription = createSubscriptionRecord();
    tx.userSubscription.findFirst.mockResolvedValue(subscription);
    tx.userSubscription.update.mockResolvedValue(canceledChangeSubscription);

    const result = await subscriptionsRepository.updatePendingPlanChange({
      userId: 1,
      subscriptionId: 1,
      pendingPlanId: null,
      changedAt: new Date('2026-02-02T10:00:00.000Z'),
    });

    expect(tx.userSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          pendingPlanId: null,
          planChangeRequestedAt: null,
        },
      }),
    );
    expect(result.subscription?.autoRenew).toBe(true);
  });

  it('자동갱신 실패 시 다음 재시도 시각을 저장한다', async () => {
    const failedAt = new Date('2026-02-28T10:00:00.000Z');
    const retryAt = new Date('2026-02-28T11:00:00.000Z');
    tx.userSubscription.findFirst.mockResolvedValue(createSubscriptionRecord());

    await subscriptionsRepository.recordSubscriptionRenewalFailure({
      userId: 1n,
      subscriptionId: 1n,
      attemptNumber: 1,
      failedAt,
      retryAt,
      maxAttempts: 3,
    });

    expect(tx.userSubscription.update).toHaveBeenCalledWith({
      where: { id: 1n },
      data: {
        renewalAttemptCount: 1,
        renewalRetryAt: retryAt,
      },
    });
  });

  it('자동갱신 재시도를 모두 사용하면 예약 변경과 자동갱신을 종료한다', async () => {
    const failedAt = new Date('2026-02-28T12:00:00.000Z');
    tx.userSubscription.findFirst.mockResolvedValue(
      createSubscriptionRecord({ renewalAttemptCount: 2 }),
    );

    await subscriptionsRepository.recordSubscriptionRenewalFailure({
      userId: 1n,
      subscriptionId: 1n,
      attemptNumber: 3,
      failedAt,
      retryAt: new Date('2026-02-28T13:00:00.000Z'),
      maxAttempts: 3,
    });

    expect(tx.userSubscription.update).toHaveBeenCalledWith({
      where: { id: 1n },
      data: {
        renewalAttemptCount: 3,
        renewalRetryAt: null,
        autoRenew: false,
        canceledAt: failedAt,
        pendingPlanId: null,
        planChangeRequestedAt: null,
      },
    });
  });

  it('creates a deterministic renewal payment for the pending plan', async () => {
    const pendingPlan = {
      ...createSubscriptionRecord().subscriptionPlan,
      id: 3n,
      code: 'MAX',
      name: 'MAX',
      price: 5900,
    };
    const sourceSubscription = createSubscriptionRecord({
      pendingPlanId: pendingPlan.id,
      pendingPlan,
      planChangeRequestedAt: new Date('2026-02-01T10:00:00.000Z'),
    });
    const billingKey = {
      id: 9n,
      billingKey: 'billing-key',
      customerKey: 'customer-key',
    };
    const payment = {
      id: 10n,
      orderId: 'SUBSCRIPTION_RENEWAL_1_1',
      amount: 5900,
      status: 'READY',
      receipt: null,
    };

    tx.user.findUnique.mockResolvedValue({
      id: 1n,
      email: 'user@example.com',
      nickname: 'user',
      status: 'ACTIVE',
      currentSubscriptionId: 1n,
    });
    tx.userSubscription.findFirst.mockResolvedValue(sourceSubscription);
    tx.payment.findFirst.mockResolvedValue({ billingKey });
    tx.payment.findUnique.mockResolvedValue(null);
    tx.payment.create.mockResolvedValue(payment);

    const result = await subscriptionsRepository.reserveSubscriptionRenewal(
      1n,
      1n,
      new Date('2026-02-28T10:00:00.000Z'),
      3,
    );

    expect(tx.payment.create).toHaveBeenCalledWith({
      data: {
        userId: 1n,
        billingKeyId: 9n,
        orderId: 'SUBSCRIPTION_RENEWAL_1_1',
        orderName: 'MAX 플랜 자동갱신',
        amount: 5900,
        paymentProvider: 'TOSS',
        status: 'READY',
      },
      include: { receipt: true },
    });
    expect(result).toMatchObject({
      status: 'READY',
      attemptNumber: 1,
      plan: pendingPlan,
      payment,
    });
  });
});

function createSubscriptionRecord(
  overrides: Partial<SubscriptionRecord> = {},
): SubscriptionRecord {
  return {
    id: 1n,
    userId: 1n,
    subscriptionPlanId: 2n,
    pendingPlanId: null,
    startedAt: new Date('2026-01-31T10:00:00.000Z'),
    expiresAt: new Date('2026-02-28T10:00:00.000Z'),
    canceledAt: null,
    autoRenew: true,
    planChangeRequestedAt: null,
    renewalAttemptCount: 0,
    renewalRetryAt: null,
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
    pendingPlan: overrides.pendingPlan ?? null,
  };
}
