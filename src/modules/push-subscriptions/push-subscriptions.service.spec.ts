import { AppException } from '../../common/exceptions/app.exception';
import { PushSubscriptionsRepository } from './push-subscriptions.repository';
import { PushSubscriptionsService } from './push-subscriptions.service';
import { PushSubscriptionRecord } from './push-subscriptions.types';

describe('PushSubscriptionsService', () => {
  const subscription: PushSubscriptionRecord = {
    id: 1n,
    userId: 10n,
    endpoint: 'https://example.com/push/1',
    endpointHash: 'hash',
    p256dhKey: 'p256dh',
    authKey: 'auth',
    userAgent: null,
    isActive: true,
    createdAt: new Date('2026-07-23T10:00:00.000Z'),
    updatedAt: new Date('2026-07-23T10:00:00.000Z'),
  };

  let repository: jest.Mocked<PushSubscriptionsRepository>;
  let service: PushSubscriptionsService;

  beforeEach(() => {
    repository = {
      upsert: jest.fn(),
      findAllByUser: jest.fn(),
      findByIdAndUser: jest.fn(),
      deactivate: jest.fn(),
      findActiveByUser: jest.fn(),
    } as unknown as jest.Mocked<PushSubscriptionsRepository>;
    service = new PushSubscriptionsService(repository);
  });

  it('endpoint 해시를 이용해 구독을 등록한다', async () => {
    repository.upsert.mockResolvedValue(subscription);

    const result = await service.register(10, {
      endpoint: subscription.endpoint,
      keys: { p256dh: 'p256dh', auth: 'auth' },
    });

    const [upsertData] = repository.upsert.mock.calls[0];
    expect(upsertData.userId).toBe(10n);
    expect(upsertData.endpointHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.subscriptionId).toBe(1);
  });

  it('본인의 구독 목록을 조회한다', async () => {
    repository.findAllByUser.mockResolvedValue([subscription]);

    const result = await service.findMine(10);

    expect(repository.findAllByUser).toHaveBeenCalledWith(10n);
    expect(result).toHaveLength(1);
  });

  it('존재하지 않는 구독을 비활성화할 수 없다', async () => {
    repository.findByIdAndUser.mockResolvedValue(null);

    await expect(service.deactivate(10, 999)).rejects.toBeInstanceOf(
      AppException,
    );
  });

  it('이미 비활성화된 구독은 다시 갱신하지 않는다', async () => {
    repository.findByIdAndUser.mockResolvedValue({
      ...subscription,
      isActive: false,
    });

    await expect(service.deactivate(10, 1)).resolves.toBeNull();
    expect(repository.deactivate).not.toHaveBeenCalled();
  });
});
