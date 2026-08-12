import { NearbyAlertStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NearbyAlertsRepository } from './nearby-alerts.repository';

describe('NearbyAlertsRepository.updateStatus', () => {
  let updateArgs: Prisma.NearbyAlertLogUpdateArgs | null = null;
  const update = jest.fn(
    (args: Prisma.NearbyAlertLogUpdateArgs): Promise<unknown> => {
      updateArgs = args;
      return Promise.resolve({});
    },
  );
  const prisma = {
    nearbyAlertLog: { update },
  } as unknown as PrismaService;
  const repository = new NearbyAlertsRepository(prisma);

  beforeEach(() => {
    update.mockClear();
    updateArgs = null;
  });

  it('SENT 상태로 변경할 때 실제 발송 시각을 기록한다', async () => {
    await repository.updateStatus(1n, NearbyAlertStatus.SENT);

    expect(updateArgs).not.toBeNull();
    expect(updateArgs?.data.status).toBe(NearbyAlertStatus.SENT);
    expect(updateArgs?.data.sentAt).toBeInstanceOf(Date);
  });

  it('FAILED 상태로 변경할 때 발송 시각을 기록하지 않는다', async () => {
    await repository.updateStatus(1n, NearbyAlertStatus.FAILED);

    expect(updateArgs).not.toBeNull();
    expect(updateArgs?.data).toEqual({ status: NearbyAlertStatus.FAILED });
  });
});
