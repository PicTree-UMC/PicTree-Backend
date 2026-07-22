import { PrismaService } from '../../prisma/prisma.service';
import { PaymentStatus } from './payments.constant';
import { PaymentsRepository } from './payments.repository';
import {
  PaymentRecord,
  SynchronizePaymentFromWebhookData,
} from './payments.types';

describe('PaymentsRepository', () => {
  let paymentsRepository: PaymentsRepository;
  let prisma: { $transaction: jest.Mock };
  let tx: {
    $queryRaw: jest.Mock;
    payment: {
      findUnique: jest.Mock;
      update: jest.Mock;
      findUniqueOrThrow: jest.Mock;
    };
    paymentReceipt: { upsert: jest.Mock };
  };

  beforeEach(() => {
    tx = {
      $queryRaw: jest.fn(),
      payment: {
        findUnique: jest.fn(),
        update: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      paymentReceipt: { upsert: jest.fn() },
    };
    prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    paymentsRepository = new PaymentsRepository(
      prisma as unknown as PrismaService,
    );
  });

  it('웹훅 상태 동기화 시 결제 행을 잠그고 갱신한다', async () => {
    const readyPayment = createPaymentRecord(PaymentStatus.READY);
    const donePayment = createPaymentRecord(PaymentStatus.DONE);
    const data = createSynchronizationData();

    tx.payment.findUnique.mockResolvedValue(readyPayment);
    tx.payment.findUniqueOrThrow.mockResolvedValue(donePayment);

    const result = await paymentsRepository.synchronizePaymentFromWebhook(data);

    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.payment.update).toHaveBeenCalledWith({
      where: { id: 1n },
      data: {
        providerPaymentId: 'payment-key',
        paymentMethod: '카드',
        status: PaymentStatus.DONE,
        paidAt: data.paidAt,
        failedAt: null,
        canceledAt: null,
      },
    });
    expect(tx.paymentReceipt.upsert).toHaveBeenCalled();
    expect(result).toBe(donePayment);
  });

  it('같은 웹훅이 재전송되면 결제를 다시 수정하지 않는다', async () => {
    const paidAt = new Date('2026-07-22T01:00:00.000Z');
    const donePayment = createPaymentRecord(PaymentStatus.DONE, {
      paidAt,
      receipt: {
        id: 1n,
        paymentId: 1n,
        receiptUrl: 'https://example.com/receipt',
        issuedAt: paidAt,
        createdAt: paidAt,
      },
    });

    tx.payment.findUnique.mockResolvedValue(donePayment);

    const result = await paymentsRepository.synchronizePaymentFromWebhook(
      createSynchronizationData({ paidAt }),
    );

    expect(tx.payment.update).not.toHaveBeenCalled();
    expect(tx.paymentReceipt.upsert).not.toHaveBeenCalled();
    expect(result).toBe(donePayment);
  });

  it('이미 취소된 결제를 이전 상태로 되돌리지 않는다', async () => {
    const canceledPayment = createPaymentRecord(PaymentStatus.CANCELED, {
      paidAt: new Date('2026-07-22T01:00:00.000Z'),
      canceledAt: new Date('2026-07-22T02:00:00.000Z'),
    });

    tx.payment.findUnique.mockResolvedValue(canceledPayment);

    const result = await paymentsRepository.synchronizePaymentFromWebhook(
      createSynchronizationData({ status: PaymentStatus.DONE }),
    );

    expect(tx.payment.update).not.toHaveBeenCalled();
    expect(tx.paymentReceipt.upsert).not.toHaveBeenCalled();
    expect(result).toBe(canceledPayment);
  });
});

function createSynchronizationData(
  overrides: Partial<SynchronizePaymentFromWebhookData> = {},
): SynchronizePaymentFromWebhookData {
  return {
    paymentId: 1n,
    providerPaymentId: 'payment-key',
    paymentMethod: '카드',
    status: PaymentStatus.DONE,
    paidAt: new Date('2026-07-22T01:00:00.000Z'),
    failedAt: null,
    canceledAt: null,
    receiptUrl: 'https://example.com/receipt',
    ...overrides,
  };
}

function createPaymentRecord(
  status: string,
  overrides: Partial<PaymentRecord> = {},
): PaymentRecord {
  const paidAt = new Date('2026-07-22T01:00:00.000Z');

  return {
    id: 1n,
    userId: 1n,
    usersSubscriptionId: null,
    billingKeyId: null,
    orderId: 'ORDER_1_test',
    orderName: '플러스 플랜',
    amount: 2900,
    paymentMethod: status === PaymentStatus.READY ? null : '카드',
    paymentProvider: 'TOSS',
    providerPaymentId: status === PaymentStatus.READY ? null : 'payment-key',
    status,
    paidAt: status === PaymentStatus.DONE ? paidAt : null,
    failedAt: null,
    canceledAt: null,
    createdAt: paidAt,
    updatedAt: paidAt,
    receipt: null,
    ...overrides,
  };
}
