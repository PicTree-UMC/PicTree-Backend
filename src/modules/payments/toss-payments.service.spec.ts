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
});
