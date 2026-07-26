import { Prisma } from '@prisma/client';
import { AppException } from '../../common/exceptions/app.exception';
import { TreesRepository } from './trees.repository';
import { TreesService } from './trees.service';
import { FavoriteTreeRecord, TreeRecord } from './trees.types';

describe('TreesService', () => {
  const tree: TreeRecord = {
    id: 1n,
    userId: 10n,
    name: '오아시스 만난 곳',
    description: '길 가다가 오아시스 자만추',
    latitude: new Prisma.Decimal('37.5665'),
    longitude: new Prisma.Decimal('126.9780'),
    address: '서울시 중구 ...',
    isFavorite: false,
    mood: 'HAPPY',
    defaultImage: 'DEFAULT_1',
    createdAt: new Date('2026-03-30T10:00:00.000Z'),
    updatedAt: new Date('2026-03-30T10:00:00.000Z'),
  };

  const favoriteTree: FavoriteTreeRecord = {
    id: 1n,
    name: '오아시스 만난 곳',
    description: '길 가다가 오아시스 자만추',
    createdAt: new Date('2026-03-30T10:00:00.000Z'),
    images: [
      {
        id: 11n,
        timelineRecordId: null,
        imageUrl: 'https://example.com/tree.jpg',
        sortOrder: 0,
      },
    ],
  };

  let repository: jest.Mocked<TreesRepository>;
  let service: TreesService;

  beforeEach(() => {
    repository = {
      createTree: jest.fn(),
      findTreesByUserId: jest.fn(),
      findTreeById: jest.fn(),
      findFavoriteTreesByUserId: jest.fn(),
      findTreeWithImagesById: jest.fn(),
      updateTree: jest.fn(),
      updateFavoriteStatus: jest.fn(),
      softDeleteTree: jest.fn(),
      countTreesByUserId: jest.fn(),
      findUserPlanCode: jest.fn(),
    } as unknown as jest.Mocked<TreesRepository>;

    service = new TreesService(repository);
  });

  it('즐겨찾기 장소 목록을 조회한다', async () => {
    repository.findFavoriteTreesByUserId.mockResolvedValue([favoriteTree]);

    const result = await service.getFavoriteTrees(10);

    expect(repository.findFavoriteTreesByUserId).toHaveBeenCalledWith(10);
    expect(result).toEqual({
      count: 1,
      favorites: [
        {
          treeId: 1,
          name: '오아시스 만난 곳',
          description: '길 가다가 오아시스 자만추',
          visitedAt: '2026-03-30',
          image: {
            imageId: 11,
            imageUrl: 'https://example.com/tree.jpg',
            timelineRecordId: null,
            sortOrder: 0,
          },
        },
      ],
    });
  });

  it('본인 나무의 즐겨찾기 상태를 토글한다', async () => {
    repository.findTreeById.mockResolvedValue(tree);
    repository.updateFavoriteStatus.mockResolvedValue({
      ...tree,
      isFavorite: true,
    });

    const result = await service.toggleFavorite(10, 1);

    expect(repository.updateFavoriteStatus).toHaveBeenCalledWith(1, true);
    expect(result).toEqual({ treeId: 1, isFavorite: true });
  });

  it('다른 사용자의 나무는 즐겨찾기 토글할 수 없다', async () => {
    repository.findTreeById.mockResolvedValue({
      ...tree,
      userId: 99n,
    });

    await expect(service.toggleFavorite(10, 1)).rejects.toBeInstanceOf(
      AppException,
    );
    expect(repository.updateFavoriteStatus).not.toHaveBeenCalled();
  });
});
