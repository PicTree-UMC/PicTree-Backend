import { Prisma } from '@prisma/client';
import { AppException } from '../../common/exceptions/app.exception';
import { CreateRouteRequestDto } from './dto/create-route-request.dto';
import { RoutesRepository } from './routes.repository';
import { RoutesService } from './routes.service';
import { RouteRecord, RouteWithPointsRecord } from './routes.types';

const catchAppError = async (
  promise: Promise<unknown>,
): Promise<AppException> => {
  try {
    await promise;
  } catch (error) {
    return error as AppException;
  }
  throw new Error('AppException 이 발생하지 않았습니다.');
};

describe('RoutesService', () => {
  const route: RouteRecord = {
    id: 1n,
    userId: 10n,
    routeName: '아침 산책',
    totalDistanceM: 1200,
    startedAt: new Date('2026-07-19T07:00:00.000Z'),
    endedAt: null,
    createdAt: new Date('2026-07-19T07:30:00.000Z'),
    updatedAt: new Date('2026-07-19T07:30:00.000Z'),
  };

  const routeWithPoints: RouteWithPointsRecord = {
    ...route,
    points: [
      {
        latitude: new Prisma.Decimal('37.5665'),
        longitude: new Prisma.Decimal('126.9780'),
        sequence: 0,
      },
    ],
  };

  const createDto: CreateRouteRequestDto = {
    routeName: '아침 산책',
    startedAt: new Date('2026-07-19T07:00:00.000Z'),
    points: [
      {
        latitude: 37.5665,
        longitude: 126.978,
        sequence: 0,
        recordedAt: new Date('2026-07-19T07:00:00.000Z'),
      },
    ],
  };

  let repository: jest.Mocked<RoutesRepository>;
  let service: RoutesService;

  beforeEach(() => {
    repository = {
      createRoute: jest.fn(),
      findRoutesByUserId: jest.fn(),
      findRouteById: jest.fn(),
      findRouteWithPointsById: jest.fn(),
      updateRoute: jest.fn(),
      deleteRoute: jest.fn(),
    } as unknown as jest.Mocked<RoutesRepository>;

    service = new RoutesService(repository);
  });

  describe('createRoute', () => {
    it('동선을 생성하고 routeId 를 반환한다', async () => {
      repository.createRoute.mockResolvedValue(route);

      const result = await service.createRoute(10, createDto);

      expect(result).toEqual({ routeId: 1 });
    });

    it('좌표 목록과 사용자 정보를 저장 계층에 전달한다', async () => {
      repository.createRoute.mockResolvedValue(route);

      await service.createRoute(10, createDto);

      expect(repository.createRoute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 10,
          routeName: '아침 산책',
          points: [expect.objectContaining({ latitude: 37.5665, sequence: 0 })],
        }),
      );
    });
  });

  describe('소유권 검증', () => {
    it('존재하지 않는 동선을 조회하면 ROUTE404 를 던진다', async () => {
      repository.findRouteWithPointsById.mockResolvedValue(null);

      const error = await catchAppError(service.getRoute(10, 1));

      expect(error.getResponse()).toMatchObject({ code: 'ROUTE404' });
    });

    it('타인의 동선을 조회하면 ROUTE403 을 던진다', async () => {
      repository.findRouteWithPointsById.mockResolvedValue({
        ...routeWithPoints,
        userId: 99n,
      });

      const error = await catchAppError(service.getRoute(10, 1));

      expect(error.getResponse()).toMatchObject({ code: 'ROUTE403' });
    });
  });

  describe('updateRoute', () => {
    it('수정할 값이 없으면 ROUTE400 을 던진다', async () => {
      repository.findRouteById.mockResolvedValue(route);

      const error = await catchAppError(service.updateRoute(10, 1, {}));

      expect(error.getResponse()).toMatchObject({ code: 'ROUTE400' });
      expect(repository.updateRoute).not.toHaveBeenCalled();
    });

    it('본인 동선의 이름을 수정한다', async () => {
      repository.findRouteById.mockResolvedValue(route);

      await service.updateRoute(10, 1, { routeName: '저녁 산책' });

      expect(repository.updateRoute).toHaveBeenCalledWith(1, {
        routeName: '저녁 산책',
      });
    });
  });

  describe('deleteRoute', () => {
    it('본인 동선을 삭제한다', async () => {
      repository.findRouteById.mockResolvedValue(route);

      await service.deleteRoute(10, 1);

      expect(repository.deleteRoute).toHaveBeenCalledWith(1);
    });

    it('타인의 동선은 삭제할 수 없다', async () => {
      repository.findRouteById.mockResolvedValue({ ...route, userId: 99n });

      const error = await catchAppError(service.deleteRoute(10, 1));

      expect(error.getResponse()).toMatchObject({ code: 'ROUTE403' });
      expect(repository.deleteRoute).not.toHaveBeenCalled();
    });
  });
});
