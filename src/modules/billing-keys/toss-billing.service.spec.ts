import { ConfigService } from '@nestjs/config';
import { TossBillingResultUnknownError } from './toss-billing.exception';
import { TossBillingService } from './toss-billing.service';

describe('TossBillingService', () => {
  let tossBillingService: TossBillingService;

  beforeEach(() => {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'TOSS_PAYMENTS_SECRET_KEY') {
          return 'test-secret-key';
        }

        return undefined;
      }),
    } as unknown as ConfigService;

    tossBillingService = new TossBillingService(configService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('authKey와 customerKey로 빌링키 발급을 요청한다', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          billingKey: 'billing-key',
          customerKey: 'BILLING_customer-key',
          authenticatedAt: '2026-07-20T10:00:00.000Z',
          method: '카드',
          card: {
            issuerCode: '11',
            number: '433012******1234',
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    await tossBillingService.issueBillingKey(
      'auth-key',
      'BILLING_customer-key',
    );

    const [requestUrl, requestInit] = fetchMock.mock.calls[0];

    expect(requestUrl).toBe(
      'https://api.tosspayments.com/v1/billing/authorizations/issue',
    );
    expect(requestInit?.method).toBe('POST');
    expect(new Headers(requestInit?.headers).get('Authorization')).toBe(
      `Basic ${Buffer.from('test-secret-key:').toString('base64')}`,
    );
    expect(JSON.parse(requestInit?.body as string)).toEqual({
      authKey: 'auth-key',
      customerKey: 'BILLING_customer-key',
    });
  });

  it('런타임 응답 구조가 올바르지 않으면 결과 불확실 오류를 발생시킨다', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ billingKey: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(
      tossBillingService.issueBillingKey('auth-key', 'BILLING_customer-key'),
    ).rejects.toBeInstanceOf(TossBillingResultUnknownError);
  });

  it('네트워크 오류를 결과 불확실 오류로 구분한다', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network error'));

    await expect(
      tossBillingService.issueBillingKey('auth-key', 'BILLING_customer-key'),
    ).rejects.toBeInstanceOf(TossBillingResultUnknownError);
  });

  it('이미 삭제된 빌링키의 404 응답을 성공으로 처리한다', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(null, { status: 404 }));

    await expect(
      tossBillingService.deleteBillingKey('billing-key'),
    ).resolves.toBeUndefined();

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.tosspayments.com/v1/billing/billing-key',
    );
    expect(fetchMock.mock.calls[0][1]?.method).toBe('DELETE');
  });
});
