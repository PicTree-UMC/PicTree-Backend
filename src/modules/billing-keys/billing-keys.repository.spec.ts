import { PrismaService } from '../../prisma/prisma.service';
import { BillingKeyProvider, BillingKeyStatus } from './billing-keys.constant';
import { BillingKeysRepository } from './billing-keys.repository';
import { BillingKeyRecord, CreateBillingKeyData } from './billing-keys.types';

describe('BillingKeysRepository', () => {
  const createBillingKeyData: CreateBillingKeyData = {
    userId: 1,
    paymentProvider: BillingKeyProvider.TOSS,
    billingKey: 'new-billing-key',
    customerKey: 'BILLING_customer-key',
    cardCompany: '11',
    cardNumberMasked: '433012******1234',
    status: BillingKeyStatus.ACTIVE,
    issuedAt: new Date('2026-07-20T10:00:00.000Z'),
  };

  const billingKeyRecord: BillingKeyRecord = {
    id: 1n,
    userId: 1n,
    paymentProvider: BillingKeyProvider.TOSS,
    billingKey: 'existing-billing-key',
    customerKey: 'BILLING_customer-key',
    cardCompany: '11',
    cardNumberMasked: '433012******1234',
    status: BillingKeyStatus.ACTIVE,
    issuedAt: new Date('2026-07-20T10:00:00.000Z'),
    deactivatedAt: null,
    createdAt: new Date('2026-07-20T10:00:00.000Z'),
    updatedAt: new Date('2026-07-20T10:00:00.000Z'),
  };

  it('사용자 행을 잠근 후 기존 활성 카드를 재사용한다', async () => {
    const queryRaw = jest.fn().mockResolvedValue([{ id: 1n }]);
    const findFirst = jest.fn().mockResolvedValue(billingKeyRecord);
    const create = jest.fn();
    const transactionClient = {
      $queryRaw: queryRaw,
      billingKey: { findFirst, create },
    };
    const prisma = {
      $transaction: jest.fn(
        (
          callback: (tx: typeof transactionClient) => Promise<unknown>,
        ): Promise<unknown> => callback(transactionClient),
      ),
    } as unknown as PrismaService;
    const repository = new BillingKeysRepository(prisma);

    const result =
      await repository.findOrCreateActiveBillingKey(createBillingKeyData);

    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      findFirst.mock.invocationCallOrder[0],
    );
    expect(create).not.toHaveBeenCalled();
    expect(result).toEqual({
      billingKey: billingKeyRecord,
      created: false,
    });
  });

  it('사용자 행 잠금 내에서 활성 카드가 없을 때만 생성한다', async () => {
    const queryRaw = jest.fn().mockResolvedValue([{ id: 1n }]);
    const findFirst = jest.fn().mockResolvedValue(null);
    const create = jest.fn().mockResolvedValue(billingKeyRecord);
    const transactionClient = {
      $queryRaw: queryRaw,
      billingKey: { findFirst, create },
    };
    const prisma = {
      $transaction: jest.fn(
        (
          callback: (tx: typeof transactionClient) => Promise<unknown>,
        ): Promise<unknown> => callback(transactionClient),
      ),
    } as unknown as PrismaService;
    const repository = new BillingKeysRepository(prisma);

    const result =
      await repository.findOrCreateActiveBillingKey(createBillingKeyData);

    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      billingKey: billingKeyRecord,
      created: true,
    });
  });
});
