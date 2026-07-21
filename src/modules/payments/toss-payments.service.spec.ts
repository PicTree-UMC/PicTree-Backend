import { ConfigService } from '@nestjs/config';
import { PaymentStatus } from './payments.constant';
import { TossPaymentsService } from './toss-payments.service';

describe('TossPaymentsService', () => {
  let tossPaymentsService: TossPaymentsService;

  beforeEach(() => {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'TOSS_PAYMENTS_SECRET_KEY') {
          return 'test-secret-key';
        }

        return undefined;
      }),
    } as unknown as ConfigService;

    tossPaymentsService = new TossPaymentsService(configService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('결제 취소 요청에 멱등키를 포함한다', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          paymentKey: 'payment-key',
          orderId: 'ORDER_1_test',
          status: PaymentStatus.CANCELED,
          method: '카드',
          approvedAt: '2026-07-20T09:00:00+09:00',
          receipt: null,
          cancels: [
            {
              cancelAmount: 2900,
              canceledAt: '2026-07-20T10:00:00+09:00',
              cancelStatus: PaymentStatus.DONE,
            },
          ],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    await tossPaymentsService.cancelPayment(
      'payment-key',
      '사용자 요청으로 인한 결제 취소',
      'CANCEL_PAYMENT_1',
    );

    const [requestUrl, requestInit] = fetchMock.mock.calls[0];

    expect(requestUrl).toBe(
      'https://api.tosspayments.com/v1/payments/payment-key/cancel',
    );
    expect(requestInit?.method).toBe('POST');
    expect(new Headers(requestInit?.headers).get('Idempotency-Key')).toBe(
      'CANCEL_PAYMENT_1',
    );
  });

  it('자동결제 승인 요청에 주문번호 멱등키를 포함한다', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(createPaymentResponse());

    await tossPaymentsService.approveBillingPayment('billing-key', {
      amount: 2900,
      customerKey: 'customer-key',
      orderId: 'SUBSCRIPTION_1_test',
      orderName: '플러스 플랜 구독',
    });

    const [requestUrl, requestInit] = fetchMock.mock.calls[0];

    expect(requestUrl).toBe(
      'https://api.tosspayments.com/v1/billing/billing-key',
    );
    expect(requestInit?.method).toBe('POST');
    expect(new Headers(requestInit?.headers).get('Idempotency-Key')).toBe(
      'SUBSCRIPTION_1_test',
    );
    expect(JSON.parse(requestInit?.body as string)).toMatchObject({
      amount: 2900,
      customerKey: 'customer-key',
      orderId: 'SUBSCRIPTION_1_test',
    });
  });

  it('자동결제 결과 복구 시 주문번호로 결제를 조회한다', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(createPaymentResponse());

    await tossPaymentsService.getPaymentByOrderIdForReconciliation(
      'SUBSCRIPTION_1_test',
    );

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.tosspayments.com/v1/payments/orders/SUBSCRIPTION_1_test',
    );
  });
});

function createPaymentResponse(): Response {
  return new Response(
    JSON.stringify({
      paymentKey: 'payment-key',
      orderId: 'SUBSCRIPTION_1_test',
      status: PaymentStatus.DONE,
      method: '카드',
      approvedAt: '2026-01-31T10:00:00.000Z',
      receipt: null,
      cancels: null,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}
