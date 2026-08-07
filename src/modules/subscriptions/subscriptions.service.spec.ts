import { Logger } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code';
import { PaymentStatus } from '../payments/payments.constant';
import {
  TossPaymentRejectedError,
  TossPaymentResultUnknownError,
} from '../payments/toss-payments.exception';
import { TossPaymentsService } from '../payments/toss-payments.service';
import { TossPaymentConfirmResult } from '../payments/toss-payments.types';
import { SubscriptionBillingCycle } from './subscriptions.constant';
import { SubscriptionsRepository } from './subscriptions.repository';
import { SubscriptionsService } from './subscriptions.service';
import {
  SubscriptionBillingKeyRecord,
  SubscriptionPaymentRecord,
  SubscriptionPlanRecord,
  SubscriptionRecord,
  SubscriptionRenewalReservation,
  SubscriptionStartReservation,
} from './subscriptions.types';

describe('SubscriptionsService', () => {
  let subscriptionsRepository: jest.Mocked<SubscriptionsRepository>;
  let tossPaymentsService: jest.Mocked<TossPaymentsService>;
  let subscriptionsService: SubscriptionsService;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    subscriptionsRepository = {
      findCurrentSubscription: jest.fn(),
      findActiveFreePlan: jest.fn(),
      findActivePlanById: jest.fn(),
      reserveSubscriptionPayment: jest.fn(),
      failSubscriptionPayment: jest.fn(),
      completeSubscription: jest.fn(),
      updatePendingPlanChange: jest.fn(),
      findDueSubscriptionRenewals: jest.fn(),
      reserveSubscriptionRenewal: jest.fn(),
      recordSubscriptionRenewalFailure: jest.fn(),
      updateSubscriptionAutoRenewal: jest.fn(),
    } as unknown as jest.Mocked<SubscriptionsRepository>;
    tossPaymentsService = {
      approveBillingPayment: jest.fn(),
      getPaymentByOrderIdForReconciliation: jest.fn(),
    } as unknown as jest.Mocked<TossPaymentsService>;
    subscriptionsService = new SubscriptionsService(
      subscriptionsRepository,
      tossPaymentsService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('현재 활성 구독을 조회한다', async () => {
    const subscription = createSubscriptionRecord();

    subscriptionsRepository.findCurrentSubscription.mockResolvedValue(
      subscription,
    );

    const result = await subscriptionsService.getMySubscription(1);

    expect(result).toMatchObject({
      subscriptionId: 1,
      status: 'ACTIVE',
      plan: { code: 'PLUS' },
    });
    expect(subscriptionsRepository.findActiveFreePlan).not.toHaveBeenCalled();
  });

  it('활성 구독이 없으면 무료 요금제를 반환한다', async () => {
    subscriptionsRepository.findCurrentSubscription.mockResolvedValue(null);
    subscriptionsRepository.findActiveFreePlan.mockResolvedValue(
      createPlan({ id: 1n, code: 'FREE', name: '무료', price: 0 }),
    );

    const result = await subscriptionsService.getMySubscription(1);

    expect(result).toMatchObject({
      subscriptionId: null,
      status: 'FREE',
      autoRenew: false,
      plan: { code: 'FREE' },
    });
  });

  it('예약된 플랜 변경 정보를 현재 구독과 함께 조회한다', async () => {
    const requestedAt = new Date('2026-08-08T10:00:00.000Z');
    const expiresAt = new Date('2099-02-28T10:00:00.000Z');
    subscriptionsRepository.findCurrentSubscription.mockResolvedValue(
      createSubscriptionRecord({
        pendingPlanId: 3n,
        pendingPlan: createPlan({ id: 3n, code: 'MAX', name: '맥스' }),
        planChangeRequestedAt: requestedAt,
        expiresAt,
      }),
    );

    const result = await subscriptionsService.getMySubscription(1);

    expect(result.pendingPlanChange?.plan).toMatchObject({
      id: 3,
      code: 'MAX',
    });
    expect(result.pendingPlanChange?.effectiveAt).toEqual(expiresAt);
    expect(result.pendingPlanChange?.requestedAt).toEqual(requestedAt);
  });

  it('자동결제를 승인하고 구독을 시작한다', async () => {
    const plan = createPlan();
    const payment = createPayment();
    const tossPayment = createTossPayment();
    const subscription = createSubscriptionRecord();

    subscriptionsRepository.reserveSubscriptionPayment.mockResolvedValue(
      createReservation({ plan, payment }),
    );
    tossPaymentsService.approveBillingPayment.mockResolvedValue(tossPayment);
    subscriptionsRepository.completeSubscription.mockResolvedValue(
      subscription,
    );

    const result = await subscriptionsService.createSubscription(1, {
      subscriptionPlanId: 2,
      billingKeyId: 1,
    });

    expect(tossPaymentsService.approveBillingPayment).toHaveBeenCalledWith(
      'billing-key',
      expect.objectContaining({
        amount: 2900,
        customerKey: 'customer-key',
        orderId: payment.orderId,
      }),
    );
    expect(subscriptionsRepository.completeSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        paymentId: payment.id,
        providerPaymentId: 'payment-key',
      }),
      new Date('2026-02-28T10:00:00.000Z'),
    );
    expect(result.status).toBe('ACTIVE');
  });

  it('같은 활성 요금제 재요청은 결제 없이 기존 구독을 반환한다', async () => {
    const currentSubscription = createSubscriptionRecord();

    subscriptionsRepository.reserveSubscriptionPayment.mockResolvedValue(
      createReservation({
        currentSubscription,
        payment: null,
      }),
    );

    const result = await subscriptionsService.createSubscription(1, {
      subscriptionPlanId: 2,
      billingKeyId: 1,
    });

    expect(result.subscriptionId).toBe(1);
    expect(tossPaymentsService.approveBillingPayment).not.toHaveBeenCalled();
  });

  it('다른 활성 구독이 있으면 새 구독을 거부한다', async () => {
    subscriptionsRepository.reserveSubscriptionPayment.mockResolvedValue(
      createReservation({
        currentSubscription: createSubscriptionRecord({
          subscriptionPlanId: 3n,
        }),
        payment: null,
      }),
    );

    await expect(
      subscriptionsService.createSubscription(1, {
        subscriptionPlanId: 2,
        billingKeyId: 1,
      }),
    ).rejects.toBeInstanceOf(AppException);

    expect(tossPaymentsService.approveBillingPayment).not.toHaveBeenCalled();
  });

  it('명시적인 자동결제 거절만 결제를 FAILED로 전이한다', async () => {
    const payment = createPayment();

    subscriptionsRepository.reserveSubscriptionPayment.mockResolvedValue(
      createReservation({ payment }),
    );
    tossPaymentsService.approveBillingPayment.mockRejectedValue(
      new TossPaymentRejectedError(),
    );

    await expect(
      subscriptionsService.createSubscription(1, {
        subscriptionPlanId: 2,
        billingKeyId: 1,
      }),
    ).rejects.toBeInstanceOf(AppException);

    expect(
      subscriptionsRepository.failSubscriptionPayment,
    ).toHaveBeenCalledWith(payment.id, expect.any(Date));
  });

  it('자동결제 결과가 불확실하면 주문번호로 조회해 구독을 완료한다', async () => {
    const payment = createPayment();
    const subscription = createSubscriptionRecord();

    subscriptionsRepository.reserveSubscriptionPayment.mockResolvedValue(
      createReservation({ payment }),
    );
    tossPaymentsService.approveBillingPayment.mockRejectedValue(
      new TossPaymentResultUnknownError(),
    );
    tossPaymentsService.getPaymentByOrderIdForReconciliation.mockResolvedValue(
      createTossPayment(),
    );
    subscriptionsRepository.completeSubscription.mockResolvedValue(
      subscription,
    );

    await expect(
      subscriptionsService.createSubscription(1, {
        subscriptionPlanId: 2,
        billingKeyId: 1,
      }),
    ).resolves.toMatchObject({ subscriptionId: 1 });

    expect(
      tossPaymentsService.getPaymentByOrderIdForReconciliation,
    ).toHaveBeenCalledWith(payment.orderId);
    expect(
      subscriptionsRepository.failSubscriptionPayment,
    ).not.toHaveBeenCalled();
  });

  it('승인 후 최초 저장에 실패하면 결제를 조회하고 저장을 재시도한다', async () => {
    const initialSaveError = new Error('temporary database error');
    const subscription = createSubscriptionRecord();

    subscriptionsRepository.reserveSubscriptionPayment.mockResolvedValue(
      createReservation(),
    );
    tossPaymentsService.approveBillingPayment.mockResolvedValue(
      createTossPayment(),
    );
    tossPaymentsService.getPaymentByOrderIdForReconciliation.mockResolvedValue(
      createTossPayment(),
    );
    subscriptionsRepository.completeSubscription
      .mockRejectedValueOnce(initialSaveError)
      .mockResolvedValueOnce(subscription);

    await expect(
      subscriptionsService.createSubscription(1, {
        subscriptionPlanId: 2,
        billingKeyId: 1,
      }),
    ).resolves.toMatchObject({ subscriptionId: 1 });

    expect(
      tossPaymentsService.getPaymentByOrderIdForReconciliation,
    ).toHaveBeenCalledWith('SUBSCRIPTION_1_test');
    expect(subscriptionsRepository.completeSubscription).toHaveBeenCalledTimes(
      2,
    );
    expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
  });

  it('저장 실패 후 결제 재조회도 실패하면 최초 저장 오류를 보존한다', async () => {
    const initialSaveError = new Error('database unavailable');

    subscriptionsRepository.reserveSubscriptionPayment.mockResolvedValue(
      createReservation(),
    );
    tossPaymentsService.approveBillingPayment.mockResolvedValue(
      createTossPayment(),
    );
    subscriptionsRepository.completeSubscription.mockRejectedValue(
      initialSaveError,
    );
    tossPaymentsService.getPaymentByOrderIdForReconciliation.mockRejectedValue(
      new TossPaymentResultUnknownError(),
    );

    await expect(
      subscriptionsService.createSubscription(1, {
        subscriptionPlanId: 2,
        billingKeyId: 1,
      }),
    ).rejects.toBe(initialSaveError);

    expect(subscriptionsRepository.completeSubscription).toHaveBeenCalledTimes(
      1,
    );
    expect(loggerErrorSpy).toHaveBeenCalledTimes(2);
  });

  describe('구독 플랜 변경 예약', () => {
    it('현재 구독의 다음 플랜을 예약한다', async () => {
      const targetPlan = createPlan({
        id: 3n,
        code: 'MAX',
        name: '맥스',
        price: 5900,
      });
      const updatedSubscription = createSubscriptionRecord({
        pendingPlanId: targetPlan.id,
        pendingPlan: targetPlan,
        planChangeRequestedAt: new Date('2026-08-08T10:00:00.000Z'),
      });
      subscriptionsRepository.findActivePlanById.mockResolvedValue(targetPlan);
      subscriptionsRepository.updatePendingPlanChange.mockResolvedValue({
        subscription: updatedSubscription,
        targetPlan,
        isCurrent: true,
        isExpired: false,
        isAutoRenewEnabled: true,
        isSameCurrentPlan: false,
      });

      const result = await subscriptionsService.schedulePlanChange(1, 1, {
        subscriptionPlanId: 3,
      });

      expect(
        subscriptionsRepository.updatePendingPlanChange,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          subscriptionId: 1,
          pendingPlanId: 3,
        }),
      );
      expect(result.pendingPlanChange?.plan.code).toBe('MAX');
    });

    it('현재 이용 중인 플랜으로는 변경할 수 없다', async () => {
      const targetPlan = createPlan();
      subscriptionsRepository.findActivePlanById.mockResolvedValue(targetPlan);
      subscriptionsRepository.updatePendingPlanChange.mockResolvedValue({
        subscription: createSubscriptionRecord(),
        targetPlan,
        isCurrent: true,
        isExpired: false,
        isAutoRenewEnabled: true,
        isSameCurrentPlan: true,
      });

      await expect(
        subscriptionsService.schedulePlanChange(1, 1, {
          subscriptionPlanId: 2,
        }),
      ).rejects.toBeInstanceOf(AppException);
    });

    it('예약된 플랜 변경을 취소한다', async () => {
      subscriptionsRepository.updatePendingPlanChange.mockResolvedValue({
        subscription: createSubscriptionRecord(),
        targetPlan: null,
        isCurrent: true,
        isExpired: false,
        isAutoRenewEnabled: true,
        isSameCurrentPlan: false,
      });

      const result = await subscriptionsService.cancelPlanChange(1, 1);

      expect(
        subscriptionsRepository.updatePendingPlanChange,
      ).toHaveBeenCalledWith(expect.objectContaining({ pendingPlanId: null }));
      expect(result.pendingPlanChange).toBeNull();
      expect(result.autoRenew).toBe(true);
    });
  });

  describe('구독 만료 자동갱신', () => {
    it('예약된 결제를 승인하고 다음 구독을 생성한다', async () => {
      subscriptionsRepository.findDueSubscriptionRenewals.mockResolvedValue([
        { id: 1n, userId: 1n },
      ]);
      subscriptionsRepository.reserveSubscriptionRenewal.mockResolvedValue(
        createRenewalReservation(),
      );
      tossPaymentsService.approveBillingPayment.mockResolvedValue(
        createTossPayment(),
      );
      subscriptionsRepository.completeSubscription.mockResolvedValue(
        createSubscriptionRecord({ id: 2n }),
      );

      const result =
        await subscriptionsService.processDueSubscriptionRenewals();

      expect(result).toBe(1);
      expect(tossPaymentsService.approveBillingPayment).toHaveBeenCalledTimes(
        1,
      );
      expect(subscriptionsRepository.completeSubscription).toHaveBeenCalled();
    });

    it('결제수단이 없으면 다음 재시도를 기록한다', async () => {
      subscriptionsRepository.findDueSubscriptionRenewals.mockResolvedValue([
        { id: 1n, userId: 1n },
      ]);
      subscriptionsRepository.reserveSubscriptionRenewal.mockResolvedValue(
        createRenewalReservation({
          status: 'BILLING_KEY_UNAVAILABLE',
          billingKey: null,
          payment: null,
        }),
      );

      const result =
        await subscriptionsService.processDueSubscriptionRenewals();

      expect(result).toBe(0);
      expect(
        subscriptionsRepository.recordSubscriptionRenewalFailure,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionId: 1n,
          attemptNumber: 1,
          maxAttempts: 3,
        }),
      );
    });

    it('자동결제가 거절되면 결제와 재시도 상태를 기록한다', async () => {
      subscriptionsRepository.findDueSubscriptionRenewals.mockResolvedValue([
        { id: 1n, userId: 1n },
      ]);
      subscriptionsRepository.reserveSubscriptionRenewal.mockResolvedValue(
        createRenewalReservation(),
      );
      tossPaymentsService.approveBillingPayment.mockRejectedValue(
        new TossPaymentRejectedError(),
      );

      await expect(
        subscriptionsService.processDueSubscriptionRenewals(),
      ).resolves.toBe(0);
      expect(
        subscriptionsRepository.failSubscriptionPayment,
      ).toHaveBeenCalledWith(1n, expect.any(Date));
      expect(
        subscriptionsRepository.recordSubscriptionRenewalFailure,
      ).toHaveBeenCalled();
    });
  });

  describe('구독 자동갱신 관리', () => {
    it('현재 구독의 자동갱신을 해지한다', async () => {
      subscriptionsRepository.updateSubscriptionAutoRenewal.mockResolvedValue({
        subscription: createSubscriptionRecord({
          autoRenew: false,
          canceledAt: new Date('2026-02-01T10:00:00.000Z'),
        }),
        isCurrent: true,
        isExpired: false,
      });

      const result = await subscriptionsService.cancelSubscription(1, 1);

      const updateRequest =
        subscriptionsRepository.updateSubscriptionAutoRenewal.mock.calls[0][0];

      expect(updateRequest).toMatchObject({
        userId: 1,
        subscriptionId: 1,
        autoRenew: false,
      });
      expect(updateRequest.changedAt).toBeInstanceOf(Date);
      expect(result).toMatchObject({
        subscriptionId: 1,
        autoRenew: false,
        nextBillingAt: null,
      });
    });

    it('해지 예정인 현재 구독의 자동갱신을 재개한다', async () => {
      subscriptionsRepository.updateSubscriptionAutoRenewal.mockResolvedValue({
        subscription: createSubscriptionRecord({
          autoRenew: true,
          canceledAt: null,
        }),
        isCurrent: true,
        isExpired: false,
      });

      const result = await subscriptionsService.resumeSubscription(1, 1);

      const updateRequest =
        subscriptionsRepository.updateSubscriptionAutoRenewal.mock.calls[0][0];

      expect(updateRequest).toMatchObject({
        userId: 1,
        subscriptionId: 1,
        autoRenew: true,
      });
      expect(updateRequest.changedAt).toBeInstanceOf(Date);
      expect(result.autoRenew).toBe(true);
      expect(result.nextBillingAt).toEqual(result.expiresAt);
    });

    it('소유한 구독이 없으면 변경을 거부한다', async () => {
      subscriptionsRepository.updateSubscriptionAutoRenewal.mockResolvedValue({
        subscription: null,
        isCurrent: false,
        isExpired: false,
      });

      try {
        await subscriptionsService.cancelSubscription(1, 999);
        fail('구독 없음 예외가 발생해야 합니다.');
      } catch (error) {
        expect(error).toBeInstanceOf(AppException);
        expect((error as AppException).getResponse()).toMatchObject({
          code: ErrorCode.SUBSCRIPTION_NOT_FOUND.code,
        });
      }
    });

    it('현재 구독이 아니면 자동갱신 변경을 거부한다', async () => {
      subscriptionsRepository.updateSubscriptionAutoRenewal.mockResolvedValue({
        subscription: createSubscriptionRecord(),
        isCurrent: false,
        isExpired: false,
      });

      await expect(
        subscriptionsService.cancelSubscription(1, 1),
      ).rejects.toBeInstanceOf(AppException);
    });

    it('만료된 구독은 자동갱신을 재개할 수 없다', async () => {
      subscriptionsRepository.updateSubscriptionAutoRenewal.mockResolvedValue({
        subscription: createSubscriptionRecord({
          expiresAt: new Date('2026-01-01T00:00:00.000Z'),
        }),
        isCurrent: true,
        isExpired: true,
      });

      await expect(
        subscriptionsService.resumeSubscription(1, 1),
      ).rejects.toBeInstanceOf(AppException);
    });
  });

  it('rejects a subscription when the approved amount differs', async () => {
    subscriptionsRepository.reserveSubscriptionPayment.mockResolvedValue(
      createReservation(),
    );
    tossPaymentsService.approveBillingPayment.mockResolvedValue(
      createTossPayment({ totalAmount: 1900 }),
    );
    tossPaymentsService.getPaymentByOrderIdForReconciliation.mockResolvedValue(
      createTossPayment({ totalAmount: 1900 }),
    );

    await expect(
      subscriptionsService.createSubscription(1, {
        subscriptionPlanId: 2,
        billingKeyId: 1,
      }),
    ).rejects.toBeInstanceOf(AppException);

    expect(subscriptionsRepository.completeSubscription).not.toHaveBeenCalled();
  });
});

function createPlan(
  overrides: Partial<SubscriptionPlanRecord> = {},
): SubscriptionPlanRecord {
  return {
    id: 2n,
    code: 'PLUS',
    name: '플러스',
    price: 2900,
    billingCycle: SubscriptionBillingCycle.MONTHLY,
    description: null,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function createBillingKey(): SubscriptionBillingKeyRecord {
  return {
    id: 1n,
    userId: 1n,
    paymentProvider: 'TOSS',
    billingKey: 'billing-key',
    customerKey: 'customer-key',
    cardCompany: '11',
    cardNumberMasked: '433012******1234',
    status: 'ACTIVE',
    issuedAt: new Date('2026-01-01T00:00:00.000Z'),
    deactivatedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

function createPayment(): SubscriptionPaymentRecord {
  return {
    id: 1n,
    userId: 1n,
    usersSubscriptionId: null,
    billingKeyId: 1n,
    orderId: 'SUBSCRIPTION_1_test',
    orderName: '플러스 플랜 구독',
    amount: 2900,
    paymentMethod: null,
    paymentProvider: 'TOSS',
    providerPaymentId: null,
    status: PaymentStatus.READY,
    paidAt: null,
    failedAt: null,
    canceledAt: null,
    createdAt: new Date('2026-01-31T09:00:00.000Z'),
    updatedAt: new Date('2026-01-31T09:00:00.000Z'),
    receipt: null,
  };
}

function createSubscriptionRecord(
  overrides: Partial<SubscriptionRecord> = {},
): SubscriptionRecord {
  return {
    id: 1n,
    userId: 1n,
    subscriptionPlanId: 2n,
    pendingPlanId: null,
    startedAt: new Date('2026-01-31T10:00:00.000Z'),
    expiresAt: new Date('2099-02-28T10:00:00.000Z'),
    canceledAt: null,
    autoRenew: true,
    planChangeRequestedAt: null,
    renewalAttemptCount: 0,
    renewalRetryAt: null,
    createdAt: new Date('2026-01-31T10:00:00.000Z'),
    updatedAt: new Date('2026-01-31T10:00:00.000Z'),
    subscriptionPlan: createPlan(),
    ...overrides,
    pendingPlan: overrides.pendingPlan ?? null,
  };
}

function createReservation(
  overrides: Partial<SubscriptionStartReservation> = {},
): SubscriptionStartReservation {
  return {
    user: {
      id: 1n,
      email: 'user@example.com',
      nickname: '승범',
      status: 'ACTIVE',
    },
    plan: createPlan(),
    billingKey: createBillingKey(),
    currentSubscription: null,
    pendingPayment: null,
    payment: createPayment(),
    ...overrides,
  };
}

function createRenewalReservation(
  overrides: Partial<SubscriptionRenewalReservation> = {},
): SubscriptionRenewalReservation {
  return {
    status: 'READY',
    attemptNumber: 1,
    sourceSubscription: createSubscriptionRecord({
      expiresAt: new Date('2026-08-08T09:00:00.000Z'),
    }),
    user: {
      id: 1n,
      email: 'user@example.com',
      nickname: '승범',
      status: 'ACTIVE',
    },
    plan: createPlan(),
    billingKey: createBillingKey(),
    payment: createPayment(),
    ...overrides,
  };
}

function createTossPayment(
  overrides: Partial<TossPaymentConfirmResult> = {},
): TossPaymentConfirmResult {
  return {
    paymentKey: 'payment-key',
    orderId: 'SUBSCRIPTION_1_test',
    totalAmount: 2900,
    status: PaymentStatus.DONE,
    method: '카드',
    approvedAt: '2026-01-31T10:00:00.000Z',
    receipt: { url: 'https://example.com/receipt' },
    cancels: null,
    ...overrides,
  };
}
