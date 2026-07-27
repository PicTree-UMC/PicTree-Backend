import { NearbyAlertStatus, Prisma } from '@prisma/client';
import { AppException } from '../../common/exceptions/app.exception';
import { PushSubscriptionsRepository } from '../push-subscriptions/push-subscriptions.repository';
import { PushSubscriptionRecord } from '../push-subscriptions/push-subscriptions.types';
import { TreesRepository } from '../trees/trees.repository';
import { NearbyAlertsRepository } from './nearby-alerts.repository';
import { NearbyAlertsService } from './nearby-alerts.service';
import { NearbyAlertLogRecord } from './nearby-alerts.types';
import { WebPushService } from './web-push.service';

describe('NearbyAlertsService', () => {
  const subscription: PushSubscriptionRecord = {
    id: 1n,
    userId: 10n,
    endpoint: 'https://example.com/push/1',
    endpointHash: 'hash',
    p256dhKey: 'p256dh',
    authKey: 'auth',
    userAgent: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const log: NearbyAlertLogRecord = {
    id: 5n,
    userId: 10n,
    treeId: 2n,
    distanceM: 42,
    alertDate: new Date('2026-07-23T00:00:00.000Z'),
    status: NearbyAlertStatus.PENDING,
    sentAt: null,
    openedAt: null,
    tree: { name: '벚나무', defaultImage: 'DEFAULT_1' },
  };

  let alertsRepository: jest.Mocked<NearbyAlertsRepository>;
  let treesRepository: jest.Mocked<TreesRepository>;
  let subscriptionsRepository: jest.Mocked<PushSubscriptionsRepository>;
  let webPushService: jest.Mocked<WebPushService>;
  let service: NearbyAlertsService;

  beforeEach(() => {
    alertsRepository = {
      isNotificationEnabled: jest.fn(),
      createIfAbsent: jest.fn(),
      updateStatus: jest.fn(),
      findAllByUser: jest.fn(),
      findByIdAndUser: jest.fn(),
      markOpened: jest.fn(),
    } as unknown as jest.Mocked<NearbyAlertsRepository>;
    treesRepository = {
      findNearbyTrees: jest.fn(),
    } as unknown as jest.Mocked<TreesRepository>;
    subscriptionsRepository = {
      findActiveByUser: jest.fn(),
      deactivate: jest.fn(),
    } as unknown as jest.Mocked<PushSubscriptionsRepository>;
    webPushService = {
      send: jest.fn(),
    } as unknown as jest.Mocked<WebPushService>;
    service = new NearbyAlertsService(
      alertsRepository,
      treesRepository,
      subscriptionsRepository,
      webPushService,
    );
  });

  it('알림 설정이 꺼져 있어도 실제 근처 나무 개수를 반환한다', async () => {
    alertsRepository.isNotificationEnabled.mockResolvedValue(false);
    treesRepository.findNearbyTrees.mockResolvedValue([
      {
        id: 2n,
        name: '벚나무',
        latitude: new Prisma.Decimal(37.5),
        longitude: new Prisma.Decimal(127),
        mood: 'HAPPY',
        defaultImage: 'DEFAULT_1',
        distanceM: 42,
      },
    ]);

    const result = await service.check(10, {
      latitude: 37.5,
      longitude: 127,
    });

    expect(result).toEqual({ nearbyCount: 1, sentCount: 0 });
    expect(subscriptionsRepository.findActiveByUser).not.toHaveBeenCalled();
  });

  it('근처 나무를 찾고 활성 구독으로 알림을 전송한다', async () => {
    alertsRepository.isNotificationEnabled.mockResolvedValue(true);
    treesRepository.findNearbyTrees.mockResolvedValue([
      {
        id: 2n,
        name: '벚나무',
        latitude: new Prisma.Decimal(37.5),
        longitude: new Prisma.Decimal(127),
        mood: 'HAPPY',
        defaultImage: 'DEFAULT_1',
        distanceM: 41.6,
      },
    ]);
    subscriptionsRepository.findActiveByUser.mockResolvedValue([subscription]);
    alertsRepository.createIfAbsent.mockResolvedValue(log);
    webPushService.send.mockResolvedValue(true);
    alertsRepository.updateStatus.mockResolvedValue({
      ...log,
      status: NearbyAlertStatus.SENT,
    });

    const result = await service.check(10, {
      latitude: 37.5,
      longitude: 127,
    });

    expect(result).toEqual({ nearbyCount: 1, sentCount: 1 });
    expect(alertsRepository.updateStatus).toHaveBeenCalledWith(
      5n,
      NearbyAlertStatus.SENT,
    );
  });

  it('만료된 구독을 자동으로 비활성화한다', async () => {
    alertsRepository.isNotificationEnabled.mockResolvedValue(true);
    treesRepository.findNearbyTrees.mockResolvedValue([
      {
        id: 2n,
        name: '벚나무',
        latitude: new Prisma.Decimal(37.5),
        longitude: new Prisma.Decimal(127),
        mood: 'HAPPY',
        defaultImage: 'DEFAULT_1',
        distanceM: 42,
      },
    ]);
    subscriptionsRepository.findActiveByUser.mockResolvedValue([subscription]);
    alertsRepository.createIfAbsent.mockResolvedValue(log);
    webPushService.send.mockResolvedValue(false);
    alertsRepository.updateStatus.mockResolvedValue({
      ...log,
      status: NearbyAlertStatus.FAILED,
    });

    const result = await service.check(10, {
      latitude: 37.5,
      longitude: 127,
    });

    expect(subscriptionsRepository.deactivate).toHaveBeenCalledWith(1n);
    expect(result.sentCount).toBe(0);
  });

  it('푸시 설정 오류가 발생해도 기록을 실패 처리하고 응답을 반환한다', async () => {
    alertsRepository.isNotificationEnabled.mockResolvedValue(true);
    treesRepository.findNearbyTrees.mockResolvedValue([
      {
        id: 2n,
        name: '벚나무',
        latitude: new Prisma.Decimal(37.5),
        longitude: new Prisma.Decimal(127),
        mood: 'HAPPY',
        defaultImage: 'DEFAULT_1',
        distanceM: 42,
      },
      {
        id: 3n,
        name: '은행나무',
        latitude: new Prisma.Decimal(37.5001),
        longitude: new Prisma.Decimal(127.0001),
        mood: 'NORMAL',
        defaultImage: 'DEFAULT_2',
        distanceM: 58,
      },
    ]);
    subscriptionsRepository.findActiveByUser.mockResolvedValue([subscription]);
    alertsRepository.createIfAbsent
      .mockResolvedValueOnce(log)
      .mockResolvedValueOnce({ ...log, id: 6n, treeId: 3n });
    webPushService.send
      .mockRejectedValueOnce(
        new AppException({
          status: 500,
          code: 'PUSH_CONFIG_MISSING',
          message: '푸시 알림 설정이 누락되었습니다.',
        }),
      )
      .mockResolvedValueOnce(true);
    alertsRepository.updateStatus.mockResolvedValue({
      ...log,
      status: NearbyAlertStatus.FAILED,
    });

    await expect(
      service.check(10, {
        latitude: 37.5,
        longitude: 127,
      }),
    ).resolves.toEqual({ nearbyCount: 2, sentCount: 1 });
    expect(alertsRepository.updateStatus).toHaveBeenCalledWith(
      5n,
      NearbyAlertStatus.FAILED,
    );
    expect(alertsRepository.updateStatus).toHaveBeenCalledWith(
      6n,
      NearbyAlertStatus.SENT,
    );
  });

  it('한 나무의 알림 기록 생성이 실패해도 다음 나무를 처리한다', async () => {
    alertsRepository.isNotificationEnabled.mockResolvedValue(true);
    treesRepository.findNearbyTrees.mockResolvedValue([
      {
        id: 2n,
        name: '벚나무',
        latitude: new Prisma.Decimal(37.5),
        longitude: new Prisma.Decimal(127),
        mood: 'HAPPY',
        defaultImage: 'DEFAULT_1',
        distanceM: 42,
      },
      {
        id: 3n,
        name: '은행나무',
        latitude: new Prisma.Decimal(37.5001),
        longitude: new Prisma.Decimal(127.0001),
        mood: 'NORMAL',
        defaultImage: 'DEFAULT_2',
        distanceM: 58,
      },
    ]);
    subscriptionsRepository.findActiveByUser.mockResolvedValue([subscription]);
    alertsRepository.createIfAbsent
      .mockRejectedValueOnce(new Error('DB connection failed'))
      .mockResolvedValueOnce({ ...log, id: 6n, treeId: 3n });
    webPushService.send.mockResolvedValue(true);
    alertsRepository.updateStatus.mockResolvedValue({
      ...log,
      id: 6n,
      treeId: 3n,
      status: NearbyAlertStatus.SENT,
    });

    await expect(
      service.check(10, {
        latitude: 37.5,
        longitude: 127,
      }),
    ).resolves.toEqual({ nearbyCount: 2, sentCount: 1 });
    expect(webPushService.send).toHaveBeenCalledTimes(1);
    expect(alertsRepository.updateStatus).toHaveBeenCalledWith(
      6n,
      NearbyAlertStatus.SENT,
    );
  });

  it('한 나무의 상태 갱신이 실패해도 다음 나무를 처리한다', async () => {
    alertsRepository.isNotificationEnabled.mockResolvedValue(true);
    treesRepository.findNearbyTrees.mockResolvedValue([
      {
        id: 2n,
        name: '벚나무',
        latitude: new Prisma.Decimal(37.5),
        longitude: new Prisma.Decimal(127),
        mood: 'HAPPY',
        defaultImage: 'DEFAULT_1',
        distanceM: 42,
      },
      {
        id: 3n,
        name: '은행나무',
        latitude: new Prisma.Decimal(37.5001),
        longitude: new Prisma.Decimal(127.0001),
        mood: 'NORMAL',
        defaultImage: 'DEFAULT_2',
        distanceM: 58,
      },
    ]);
    subscriptionsRepository.findActiveByUser.mockResolvedValue([subscription]);
    alertsRepository.createIfAbsent
      .mockResolvedValueOnce(log)
      .mockResolvedValueOnce({ ...log, id: 6n, treeId: 3n });
    webPushService.send.mockResolvedValue(true);
    alertsRepository.updateStatus
      .mockRejectedValueOnce(new Error('DB connection failed'))
      .mockResolvedValueOnce({
        ...log,
        id: 6n,
        treeId: 3n,
        status: NearbyAlertStatus.SENT,
      });

    await expect(
      service.check(10, {
        latitude: 37.5,
        longitude: 127,
      }),
    ).resolves.toEqual({ nearbyCount: 2, sentCount: 1 });
    expect(webPushService.send).toHaveBeenCalledTimes(2);
    expect(alertsRepository.updateStatus).toHaveBeenCalledWith(
      6n,
      NearbyAlertStatus.SENT,
    );
  });

  it('본인 소유가 아닌 알림 기록은 확인할 수 없다', async () => {
    alertsRepository.findByIdAndUser.mockResolvedValue(null);

    await expect(service.open(10, 999)).rejects.toBeInstanceOf(AppException);
  });
});
