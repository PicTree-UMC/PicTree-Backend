import { Prisma } from '@prisma/client';
import { AppException } from '../../common/exceptions/app.exception';
import { S3Service } from '../../common/s3/s3.service';
import { CreateRouteRequestDto } from './dto/create-route-request.dto';
import { RoutesRepository } from './routes.repository';
import { RoutesService } from './routes.service';
import {
  RouteListItemRecord,
  RouteRecord,
  RouteWithPointsRecord,
} from './routes.types';

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
    createdAt: new Date('2026-07-19T07:30:00.000Z'),
    updatedAt: new Date('2026-07-19T07:30:00.000Z'),
  };

  const routeWithPoints: RouteWithPointsRecord = {
    ...route,
    points: [
      {
        sequence: 0,
        tree: {
          id: 1n,
          name: '오아시스 만난 곳',
          mood: '😍',
          description: '갤러거 형제 자만추',
          latitude: new Prisma.Decimal('37.5665'),
          longitude: new Prisma.Decimal('126.9780'),
          deletedAt: null,
        },
      },
    ],
  };

  const createDto: CreateRouteRequestDto = {
    routeName: '아침 산책',
    points: [
      { treeId: 1, sequence: 0 },
      { treeId: 2, sequence: 1 },
    ],
  };

  let repository: jest.Mocked<RoutesRepository>;
  let s3Service: jest.Mocked<S3Service>;
  let service: RoutesService;

  beforeEach(() => {
    repository = {
      createRoute: jest.fn(),
      countOwnedTrees: jest.fn(),
      findRoutesByUserId: jest.fn(),
      findRouteById: jest.fn(),
      findRouteWithPointsById: jest.fn(),
      findRoutePointsWithImages: jest.fn(),
      updateRoute: jest.fn(),
      deleteRoute: jest.fn(),
    } as unknown as jest.Mocked<RoutesRepository>;

    s3Service = {
      upload: jest.fn(),
      delete: jest.fn(),
      getPresignedUrl: jest.fn(),
    } as unknown as jest.Mocked<S3Service>;

    service = new RoutesService(repository, s3Service);
  });

  describe('createRoute', () => {
    it('본인 소유 나무들로 동선을 생성하고 routeId 를 반환한다', async () => {
      repository.countOwnedTrees.mockResolvedValue(2);
      repository.createRoute.mockResolvedValue(route);

      const result = await service.createRoute(10, createDto);

      expect(repository.countOwnedTrees).toHaveBeenCalledWith([1, 2], 10);
      expect(result).toEqual({ routeId: 1 });
    });

    it('노드(나무·순서)를 저장 계층에 전달한다', async () => {
      repository.countOwnedTrees.mockResolvedValue(2);
      repository.createRoute.mockResolvedValue(route);

      await service.createRoute(10, createDto);

      expect(repository.createRoute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 10,
          routeName: '아침 산책',
          points: [
            { treeId: 1, sequence: 0 },
            { treeId: 2, sequence: 1 },
          ],
        }),
      );
    });

    it('존재하지 않거나 타인 소유의 나무가 있으면 ROUTE400 을 던진다', async () => {
      repository.countOwnedTrees.mockResolvedValue(1); // 2개 중 1개만 유효

      const error = await catchAppError(service.createRoute(10, createDto));

      expect(error.getResponse()).toMatchObject({ code: 'ROUTE400' });
      expect(repository.createRoute).not.toHaveBeenCalled();
    });
  });

  describe('getMyRoutes', () => {
    it('동선 목록을 장소 정보·기록날짜와 함께 반환한다', async () => {
      const listItem: RouteListItemRecord = {
        ...route,
        points: [
          {
            sequence: 0,
            tree: {
              name: '포그레인 공원',
              mood: '😀',
              createdAt: new Date('2026-04-01T09:00:00.000Z'),
              deletedAt: null,
            },
          },
          {
            sequence: 1,
            tree: {
              name: '오아시스 만난 곳',
              mood: '😍',
              createdAt: new Date('2026-04-01T10:00:00.000Z'),
              deletedAt: null,
            },
          },
        ],
      };
      repository.findRoutesByUserId.mockResolvedValue([[listItem], 1]);

      const result = await service.getMyRoutes(10, {});

      expect(result.items[0]).toEqual({
        routeId: 1,
        routeName: '아침 산책',
        recordDate: '2026-04-01',
        placeCount: 2,
        places: [
          { name: '포그레인 공원', mood: '😀' },
          { name: '오아시스 만난 곳', mood: '😍' },
        ],
        createdAt: route.createdAt,
      });
      expect(result.total).toBe(1);
    });

    it('소프트 삭제된 나무는 목록 카드에서 제외한다', async () => {
      const listItem: RouteListItemRecord = {
        ...route,
        points: [
          {
            sequence: 0,
            tree: {
              name: '살아있는 곳',
              mood: '😀',
              createdAt: new Date('2026-04-01T09:00:00.000Z'),
              deletedAt: null,
            },
          },
          {
            sequence: 1,
            tree: {
              name: '삭제된 곳',
              mood: '😢',
              createdAt: new Date('2026-04-01T10:00:00.000Z'),
              deletedAt: new Date('2026-04-02T00:00:00.000Z'),
            },
          },
        ],
      };
      repository.findRoutesByUserId.mockResolvedValue([[listItem], 1]);

      const result = await service.getMyRoutes(10, {});

      expect(result.items[0].placeCount).toBe(1);
      expect(result.items[0].places).toEqual([
        { name: '살아있는 곳', mood: '😀' },
      ]);
    });
  });

  describe('getRoute', () => {
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

    it('동선 노드를 나무 정보와 함께 순서대로 반환한다', async () => {
      repository.findRouteWithPointsById.mockResolvedValue(routeWithPoints);

      const result = await service.getRoute(10, 1);

      expect(result.points).toEqual([
        {
          treeId: 1,
          name: '오아시스 만난 곳',
          mood: '😍',
          description: '갤러거 형제 자만추',
          latitude: 37.5665,
          longitude: 126.978,
          sequence: 0,
        },
      ]);
    });

    it('소프트 삭제된 나무는 동선에서 제외한다', async () => {
      repository.findRouteWithPointsById.mockResolvedValue({
        ...route,
        points: [
          routeWithPoints.points[0],
          {
            sequence: 1,
            tree: {
              id: 2n,
              name: '삭제된 곳',
              mood: '😢',
              description: null,
              latitude: new Prisma.Decimal('37.6'),
              longitude: new Prisma.Decimal('127.0'),
              deletedAt: new Date('2026-07-20T00:00:00.000Z'),
            },
          },
        ],
      });

      const result = await service.getRoute(10, 1);

      expect(result.points).toHaveLength(1);
      expect(result.points[0].treeId).toBe(1);
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

    it('타인의 동선은 수정할 수 없다', async () => {
      repository.findRouteById.mockResolvedValue({ ...route, userId: 99n });

      const error = await catchAppError(
        service.updateRoute(10, 1, { routeName: '저녁 산책' }),
      );

      expect(error.getResponse()).toMatchObject({ code: 'ROUTE403' });
      expect(repository.updateRoute).not.toHaveBeenCalled();
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

  describe('getRouteImages', () => {
    it('장소들의 대표 사진을 방문 순서로 반환하고 사진 없으면 null 이다', async () => {
      repository.findRouteById.mockResolvedValue(route);
      repository.findRoutePointsWithImages.mockResolvedValue([
        {
          tree: {
            id: 1n,
            name: '오아시스 만난 곳',
            deletedAt: null,
            images: [{ s3Key: 'trees/1/a.jpg' }],
          },
        },
        { tree: { id: 2n, name: '쇼핑', deletedAt: null, images: [] } },
      ]);
      s3Service.getPresignedUrl.mockImplementation((key) =>
        Promise.resolve(`https://signed/${key}`),
      );

      const result = await service.getRouteImages(10, 1);

      expect(result.images).toEqual([
        {
          treeId: 1,
          name: '오아시스 만난 곳',
          imageUrl: 'https://signed/trees/1/a.jpg',
        },
        { treeId: 2, name: '쇼핑', imageUrl: null },
      ]);
    });

    it('소프트 삭제된 나무는 제외한다', async () => {
      repository.findRouteById.mockResolvedValue(route);
      repository.findRoutePointsWithImages.mockResolvedValue([
        {
          tree: {
            id: 1n,
            name: '살아있는 곳',
            deletedAt: null,
            images: [{ s3Key: 'trees/1/a.jpg' }],
          },
        },
        {
          tree: {
            id: 2n,
            name: '삭제된 곳',
            deletedAt: new Date('2026-07-20T00:00:00.000Z'),
            images: [{ s3Key: 'trees/2/b.jpg' }],
          },
        },
      ]);
      s3Service.getPresignedUrl.mockResolvedValue('https://signed');

      const result = await service.getRouteImages(10, 1);

      expect(result.images).toHaveLength(1);
      expect(result.images[0].treeId).toBe(1);
    });

    it('존재하지 않는 동선이면 ROUTE404 를 던진다', async () => {
      repository.findRouteById.mockResolvedValue(null);

      const error = await catchAppError(service.getRouteImages(10, 1));

      expect(error.getResponse()).toMatchObject({ code: 'ROUTE404' });
      expect(repository.findRoutePointsWithImages).not.toHaveBeenCalled();
    });

    it('타인의 동선이면 ROUTE403 을 던진다', async () => {
      repository.findRouteById.mockResolvedValue({ ...route, userId: 99n });

      const error = await catchAppError(service.getRouteImages(10, 1));

      expect(error.getResponse()).toMatchObject({ code: 'ROUTE403' });
      expect(repository.findRoutePointsWithImages).not.toHaveBeenCalled();
    });
  });
});
