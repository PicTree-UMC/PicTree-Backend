import { ConfigService } from '@nestjs/config';
import { AppException } from '../../common/exceptions/app.exception';
import { BillingKeyStatus } from './billing-keys.constant';
import { BillingKeysRepository } from './billing-keys.repository';
import { BillingKeysService } from './billing-keys.service';
import { BillingKeyRecord } from './billing-keys.types';
import { TossBillingResultUnknownError } from './toss-billing.exception';
import { TossBillingService } from './toss-billing.service';
import { TossBillingKeyResponse } from './toss-billing.types';

describe('BillingKeysService', () => {
  let billingKeysService: BillingKeysService;
  let billingKeysRepository: {
    findOrCreateActiveBillingKey: jest.Mock;
    findActiveBillingKeysByUserId: jest.Mock;
    findBillingKeyByIdAndUserId: jest.Mock;
    deactivateBillingKey: jest.Mock;
  };
  let tossBillingService: {
    issueBillingKey: jest.Mock;
    deleteBillingKey: jest.Mock;
  };

  const createBillingKeyRecord = (
    overrides: Partial<BillingKeyRecord> = {},
  ): BillingKeyRecord => ({
    id: 1n,
    userId: 1n,
    paymentProvider: 'TOSS',
    billingKey: 'secret-billing-key',
    customerKey: 'customer-key',
    cardCompany: '11',
    cardNumberMasked: '433012******1234',
    status: BillingKeyStatus.ACTIVE,
    issuedAt: new Date('2026-07-20T10:00:00.000Z'),
    deactivatedAt: null,
    createdAt: new Date('2026-07-20T10:00:00.000Z'),
    updatedAt: new Date('2026-07-20T10:00:00.000Z'),
    ...overrides,
  });

  const createTossBillingKey = (
    customerKey: string,
  ): TossBillingKeyResponse => ({
    billingKey: 'secret-billing-key',
    customerKey,
    authenticatedAt: '2026-07-20T10:00:00.000Z',
    method: '카드',
    card: {
      issuerCode: '11',
      number: '433012******1234',
    },
  });

  beforeEach(() => {
    billingKeysRepository = {
      findOrCreateActiveBillingKey: jest.fn(),
      findActiveBillingKeysByUserId: jest.fn(),
      findBillingKeyByIdAndUserId: jest.fn(),
      deactivateBillingKey: jest.fn(),
    };
    tossBillingService = {
      issueBillingKey: jest.fn(),
      deleteBillingKey: jest.fn(),
    };
    const configService = {
      get: jest.fn((key: string) =>
        key === 'TOSS_BILLING_CUSTOMER_KEY_SECRET'
          ? 'customer-key-secret'
          : undefined,
      ),
    } as unknown as ConfigService;

    billingKeysService = new BillingKeysService(
      billingKeysRepository as unknown as BillingKeysRepository,
      tossBillingService as unknown as TossBillingService,
      configService,
    );
  });

  it('사용자별로 안정적이고 서로 다른 customerKey를 생성한다', () => {
    const firstKey = billingKeysService.getCustomerKey(1).customerKey;
    const sameUserKey = billingKeysService.getCustomerKey(1).customerKey;
    const otherUserKey = billingKeysService.getCustomerKey(2).customerKey;

    expect(firstKey).toBe(sameUserKey);
    expect(firstKey).not.toBe(otherUserKey);
    expect(firstKey).toMatch(/^BILLING_[a-f0-9]{64}$/);
  });

  it('서버가 발급한 customerKey가 아니면 토스에 요청하지 않는다', async () => {
    await expect(
      billingKeysService.createBillingKey(1, {
        authKey: 'auth-key',
        customerKey: 'invalid-customer-key',
      }),
    ).rejects.toBeInstanceOf(AppException);

    expect(tossBillingService.issueBillingKey).not.toHaveBeenCalled();
    expect(
      billingKeysRepository.findOrCreateActiveBillingKey,
    ).not.toHaveBeenCalled();
  });

  it('발급한 빌링키를 저장하고 응답에는 원본 키를 노출하지 않는다', async () => {
    const customerKey = billingKeysService.getCustomerKey(1).customerKey;
    const billingKeyRecord = createBillingKeyRecord({ customerKey });

    tossBillingService.issueBillingKey.mockResolvedValue(
      createTossBillingKey(customerKey),
    );
    billingKeysRepository.findOrCreateActiveBillingKey.mockResolvedValue({
      billingKey: billingKeyRecord,
      created: true,
    });

    const result = await billingKeysService.createBillingKey(1, {
      authKey: 'auth-key',
      customerKey,
    });

    expect(
      billingKeysRepository.findOrCreateActiveBillingKey,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        billingKey: 'secret-billing-key',
        customerKey,
        cardNumberMasked: '433012******1234',
      }),
    );
    expect(result).not.toHaveProperty('billingKey');
    expect(result).not.toHaveProperty('customerKey');
  });

  it('같은 활성 카드가 있으면 새 빌링키를 삭제하고 기존 수단을 반환한다', async () => {
    const customerKey = billingKeysService.getCustomerKey(1).customerKey;
    const existingBillingKey = createBillingKeyRecord({
      billingKey: 'existing-billing-key',
      customerKey,
    });

    tossBillingService.issueBillingKey.mockResolvedValue(
      createTossBillingKey(customerKey),
    );
    billingKeysRepository.findOrCreateActiveBillingKey.mockResolvedValue({
      billingKey: existingBillingKey,
      created: false,
    });
    tossBillingService.deleteBillingKey.mockResolvedValue(undefined);

    const result = await billingKeysService.createBillingKey(1, {
      authKey: 'auth-key',
      customerKey,
    });

    expect(tossBillingService.deleteBillingKey).toHaveBeenCalledWith(
      'secret-billing-key',
    );
    expect(result.billingKeyId).toBe(1);
  });

  it('중복 빌링키 정리에 실패해도 기존 수단을 반환한다', async () => {
    const customerKey = billingKeysService.getCustomerKey(1).customerKey;
    const existingBillingKey = createBillingKeyRecord({
      billingKey: 'existing-billing-key',
      customerKey,
    });

    tossBillingService.issueBillingKey.mockResolvedValue(
      createTossBillingKey(customerKey),
    );
    billingKeysRepository.findOrCreateActiveBillingKey.mockResolvedValue({
      billingKey: existingBillingKey,
      created: false,
    });
    tossBillingService.deleteBillingKey.mockRejectedValue(
      new TossBillingResultUnknownError(),
    );

    await expect(
      billingKeysService.createBillingKey(1, {
        authKey: 'auth-key',
        customerKey,
      }),
    ).resolves.toMatchObject({ billingKeyId: 1 });
  });

  it('중복 빌링키 정리의 예상하지 못한 오류는 전파한다', async () => {
    const customerKey = billingKeysService.getCustomerKey(1).customerKey;
    const unexpectedError = new Error('unexpected error');

    tossBillingService.issueBillingKey.mockResolvedValue(
      createTossBillingKey(customerKey),
    );
    billingKeysRepository.findOrCreateActiveBillingKey.mockResolvedValue({
      billingKey: createBillingKeyRecord({ customerKey }),
      created: false,
    });
    tossBillingService.deleteBillingKey.mockRejectedValue(unexpectedError);

    await expect(
      billingKeysService.createBillingKey(1, {
        authKey: 'auth-key',
        customerKey,
      }),
    ).rejects.toBe(unexpectedError);
  });

  it('다른 사용자의 결제 수단은 삭제할 수 없다', async () => {
    billingKeysRepository.findBillingKeyByIdAndUserId.mockResolvedValue(null);

    await expect(
      billingKeysService.deactivateBillingKey(1, 2),
    ).rejects.toBeInstanceOf(AppException);

    expect(tossBillingService.deleteBillingKey).not.toHaveBeenCalled();
  });

  it('토스 삭제 결과가 불확실하면 로컬 결제 수단을 활성 상태로 보존한다', async () => {
    billingKeysRepository.findBillingKeyByIdAndUserId.mockResolvedValue(
      createBillingKeyRecord(),
    );
    tossBillingService.deleteBillingKey.mockRejectedValue(
      new TossBillingResultUnknownError(),
    );

    await expect(
      billingKeysService.deactivateBillingKey(1, 1),
    ).rejects.toBeInstanceOf(AppException);

    expect(billingKeysRepository.deactivateBillingKey).not.toHaveBeenCalled();
  });

  it('이미 삭제된 결제 수단의 삭제 요청은 멱등하게 처리한다', async () => {
    const deactivatedAt = new Date('2026-07-20T11:00:00.000Z');

    billingKeysRepository.findBillingKeyByIdAndUserId.mockResolvedValue(
      createBillingKeyRecord({
        status: BillingKeyStatus.DEACTIVATED,
        deactivatedAt,
      }),
    );

    const result = await billingKeysService.deactivateBillingKey(1, 1);

    expect(tossBillingService.deleteBillingKey).not.toHaveBeenCalled();
    expect(result).toEqual({
      billingKeyId: 1,
      status: BillingKeyStatus.DEACTIVATED,
      deactivatedAt,
    });
  });
});
