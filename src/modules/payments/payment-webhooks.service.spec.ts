import { Logger } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception';
import { TossPaymentWebhookRequestDto } from './dto/toss-payment-webhook-request.dto';
import { PaymentStatus, TossPaymentWebhookEvent } from './payments.constant';
import { PaymentWebhooksService } from './payment-webhooks.service';
import { PaymentsRepository } from './payments.repository';
import { PaymentRecord } from './payments.types';
import { TossPaymentResultUnknownError } from './toss-payments.exception';
import { TossPaymentsService } from './toss-payments.service';
import { TossPaymentConfirmResult } from './toss-payments.types';

describe('PaymentWebhooksService', () => {
  let paymentWebhooksService: PaymentWebhooksService;
  let paymentsRepository: jest.Mocked<PaymentsRepository>;
  let tossPaymentsService: jest.Mocked<TossPaymentsService>;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    paymentsRepository = {
      findPaymentByOrderId: jest.fn(),
      synchronizePaymentFromWebhook: jest.fn(),
    } as unknown as jest.Mocked<PaymentsRepository>;
    tossPaymentsService = {
      getPaymentByOrderIdForWebhook: jest.fn(),
    } as unknown as jest.Mocked<TossPaymentsService>;
    paymentWebhooksService = new PaymentWebhooksService(
      paymentsRepository,
      tossPaymentsService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('지원하지 않는 이벤트는 결제를 조회하지 않고 무시한다', async () => {
    await paymentWebhooksService.handleTossPaymentWebhook(
      {
        eventType: 'BILLING_DELETED',
        createdAt: '2026-07-22T10:00:00.000Z',
      },
      'transmission-1',
    );

    expect(paymentsRepository.findPaymentByOrderId).not.toHaveBeenCalled();
    expect(
      tossPaymentsService.getPaymentByOrderIdForWebhook,
    ).not.toHaveBeenCalled();
  });

  it('결제 식별자가 없는 상태 변경 이벤트는 거부한다', async () => {
    await expect(
      paymentWebhooksService.handleTossPaymentWebhook(
        createWebhookRequest({ data: { status: 'DONE' } }),
      ),
    ).rejects.toBeInstanceOf(AppException);

    expect(paymentsRepository.findPaymentByOrderId).not.toHaveBeenCalled();
  });

  it('내부 결제가 없으면 토스를 조회하지 않고 멱등하게 종료한다', async () => {
    paymentsRepository.findPaymentByOrderId.mockResolvedValue(null);

    await paymentWebhooksService.handleTossPaymentWebhook(
      createWebhookRequest(),
      'transmission-1',
    );

    expect(
      tossPaymentsService.getPaymentByOrderIdForWebhook,
    ).not.toHaveBeenCalled();
    expect(
      paymentsRepository.synchronizePaymentFromWebhook,
    ).not.toHaveBeenCalled();
  });

  it('웹훅 Payload가 오래되어도 토스의 최신 상태로 동기화한다', async () => {
    const payment = createPaymentRecord(PaymentStatus.READY);
    const synchronizedPayment = createPaymentRecord(PaymentStatus.DONE);

    paymentsRepository.findPaymentByOrderId.mockResolvedValue(payment);
    tossPaymentsService.getPaymentByOrderIdForWebhook.mockResolvedValue(
      createTossPayment(PaymentStatus.DONE),
    );
    paymentsRepository.synchronizePaymentFromWebhook.mockResolvedValue(
      synchronizedPayment,
    );

    await paymentWebhooksService.handleTossPaymentWebhook(
      createWebhookRequest({
        data: {
          paymentKey: 'payment-key',
          orderId: 'ORDER_1_test',
          status: 'ABORTED',
        },
      }),
      'transmission-1',
    );

    expect(
      tossPaymentsService.getPaymentByOrderIdForWebhook,
    ).toHaveBeenCalledWith('ORDER_1_test');
    expect(
      paymentsRepository.synchronizePaymentFromWebhook,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: 1n,
        providerPaymentId: 'payment-key',
        status: PaymentStatus.DONE,
        paidAt: new Date('2026-07-22T01:00:00.000Z'),
      }),
    );
  });

  it('토스 조회 결과의 결제 식별자가 다르면 동기화하지 않는다', async () => {
    paymentsRepository.findPaymentByOrderId.mockResolvedValue(
      createPaymentRecord(PaymentStatus.READY),
    );
    tossPaymentsService.getPaymentByOrderIdForWebhook.mockResolvedValue(
      createTossPayment(PaymentStatus.DONE, { paymentKey: 'other-key' }),
    );

    await expect(
      paymentWebhooksService.handleTossPaymentWebhook(createWebhookRequest()),
    ).rejects.toBeInstanceOf(AppException);

    expect(
      paymentsRepository.synchronizePaymentFromWebhook,
    ).not.toHaveBeenCalled();
  });

  it('토스 조회 결과의 결제 금액이 다르면 동기화하지 않는다', async () => {
    paymentsRepository.findPaymentByOrderId.mockResolvedValue(
      createPaymentRecord(PaymentStatus.READY),
    );
    tossPaymentsService.getPaymentByOrderIdForWebhook.mockResolvedValue(
      createTossPayment(PaymentStatus.DONE, { totalAmount: 3900 }),
    );

    await expect(
      paymentWebhooksService.handleTossPaymentWebhook(createWebhookRequest()),
    ).rejects.toBeInstanceOf(AppException);

    expect(
      paymentsRepository.synchronizePaymentFromWebhook,
    ).not.toHaveBeenCalled();
  });

  it('토스 결제 조회 실패는 재전송 가능한 오류로 처리한다', async () => {
    paymentsRepository.findPaymentByOrderId.mockResolvedValue(
      createPaymentRecord(PaymentStatus.READY),
    );
    tossPaymentsService.getPaymentByOrderIdForWebhook.mockRejectedValue(
      new TossPaymentResultUnknownError(),
    );

    await expect(
      paymentWebhooksService.handleTossPaymentWebhook(createWebhookRequest()),
    ).rejects.toBeInstanceOf(AppException);
  });

  it('취소 상태는 토스의 마지막 완료 취소 시간을 저장한다', async () => {
    const payment = createPaymentRecord(PaymentStatus.DONE);

    paymentsRepository.findPaymentByOrderId.mockResolvedValue(payment);
    tossPaymentsService.getPaymentByOrderIdForWebhook.mockResolvedValue(
      createTossPayment(PaymentStatus.CANCELED),
    );
    paymentsRepository.synchronizePaymentFromWebhook.mockResolvedValue(
      createPaymentRecord(PaymentStatus.CANCELED),
    );

    await paymentWebhooksService.handleTossPaymentWebhook(
      createWebhookRequest(),
    );

    expect(
      paymentsRepository.synchronizePaymentFromWebhook,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        status: PaymentStatus.CANCELED,
        canceledAt: new Date('2026-07-22T02:00:00.000Z'),
      }),
    );
  });
});

function createWebhookRequest(
  overrides: Partial<TossPaymentWebhookRequestDto> = {},
): TossPaymentWebhookRequestDto {
  return {
    eventType: TossPaymentWebhookEvent.PAYMENT_STATUS_CHANGED,
    createdAt: '2026-07-22T10:00:00.000Z',
    data: {
      paymentKey: 'payment-key',
      orderId: 'ORDER_1_test',
      status: 'DONE',
    },
    ...overrides,
  };
}

function createPaymentRecord(status: string): PaymentRecord {
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
    paidAt: status === PaymentStatus.READY ? null : new Date(),
    failedAt: null,
    canceledAt: status === PaymentStatus.CANCELED ? new Date() : null,
    createdAt: new Date(),
    updatedAt: new Date(),
    receipt: null,
  };
}

function createTossPayment(
  status: string,
  overrides: Partial<TossPaymentConfirmResult> = {},
): TossPaymentConfirmResult {
  return {
    paymentKey: 'payment-key',
    orderId: 'ORDER_1_test',
    totalAmount: 2900,
    status,
    method: '카드',
    approvedAt: '2026-07-22T10:00:00+09:00',
    receipt: null,
    cancels:
      status === PaymentStatus.CANCELED
        ? [
            {
              cancelAmount: 2900,
              canceledAt: '2026-07-22T11:00:00+09:00',
              cancelStatus: PaymentStatus.DONE,
            },
          ]
        : null,
    ...overrides,
  } as TossPaymentConfirmResult;
}
