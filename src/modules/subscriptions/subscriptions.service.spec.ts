import { AppException } from '../../common/exceptions/app.exception';
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
  SubscriptionStartReservation,
} from './subscriptions.types';

describe('SubscriptionsService', () => {
  let subscriptionsRepository: jest.Mocked<SubscriptionsRepository>;
  let tossPaymentsService: jest.Mocked<TossPaymentsService>;
  let subscriptionsService: SubscriptionsService;

  beforeEach(() => {
    subscriptionsRepository = {
      findCurrentSubscription: jest.fn(),
      findActiveFreePlan: jest.fn(),
      reserveSubscriptionPayment: jest.fn(),
      failSubscriptionPayment: jest.fn(),
      completeSubscription: jest.fn(),
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
    startedAt: new Date('2026-01-31T10:00:00.000Z'),
    expiresAt: new Date('2099-02-28T10:00:00.000Z'),
    canceledAt: null,
    autoRenew: true,
    createdAt: new Date('2026-01-31T10:00:00.000Z'),
    updatedAt: new Date('2026-01-31T10:00:00.000Z'),
    subscriptionPlan: createPlan(),
    ...overrides,
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

function createTossPayment(): TossPaymentConfirmResult {
  return {
    paymentKey: 'payment-key',
    orderId: 'SUBSCRIPTION_1_test',
    status: PaymentStatus.DONE,
    method: '카드',
    approvedAt: '2026-01-31T10:00:00.000Z',
    receipt: { url: 'https://example.com/receipt' },
    cancels: null,
  };
}
