import { Prisma } from '@prisma/client';
import { AppException } from '../../common/exceptions/app.exception';
import { CreateTreeRequestDto } from './dto/create-tree-request.dto';
import { UpdateTreeRequestDto } from './dto/update-tree-request.dto';
import { TreesRepository } from './trees.repository';
import { TreesService } from './trees.service';
import {
  FavoriteTreeRecord,
  TreeRecord,
  TreeWithImagesRecord,
} from './trees.types';

// 서비스가 던진 AppException 을 꺼내 코드까지 검증하기 위한 헬퍼
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
    mood: '😍',
    defaultImage: 'DEFAULT_1',
    createdAt: new Date('2026-03-30T10:00:00.000Z'),
    updatedAt: new Date('2026-03-30T10:00:00.000Z'),
  };

  const treeWithImages: TreeWithImagesRecord = { ...tree, images: [] };

  const favoriteTree: FavoriteTreeRecord = {
    id: 1n,
    name: '오아시스 만난 곳',
    description: '길 가다가 오아시스 자만추',
    createdAt: new Date('2026-03-30T10:00:00.000Z'),
    image: {
      id: 11n,
      timelineRecordId: null,
      imageUrl: 'https://example.com/tree.jpg',
      sortOrder: 0,
    },
  };

  const createDto: CreateTreeRequestDto = {
    name: '벚나무',
    latitude: 37.5665,
    longitude: 126.978,
    mood: '😍',
    defaultImage: 'DEFAULT_1',
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

  describe('createTree - adRequired', () => {
    beforeEach(() => {
      repository.createTree.mockResolvedValue(tree);
    });

    it('무료 플랜에서 나무 개수가 광고 주기의 배수면 adRequired 가 true 다', async () => {
      repository.countTreesByUserId.mockResolvedValue(2);
      repository.findUserPlanCode.mockResolvedValue('FREE');

      const result = await service.createTree(10, createDto);

      expect(result).toEqual({ treeId: 1, adRequired: true });
    });

    it('유료 플랜이면 개수가 배수여도 adRequired 가 false 다', async () => {
      repository.countTreesByUserId.mockResolvedValue(2);
      repository.findUserPlanCode.mockResolvedValue('PREMIUM');

      const result = await service.createTree(10, createDto);

      expect(result.adRequired).toBe(false);
    });

    it('개수가 광고 주기의 배수가 아니면 adRequired 가 false 다', async () => {
      repository.countTreesByUserId.mockResolvedValue(3);
      repository.findUserPlanCode.mockResolvedValue('FREE');

      const result = await service.createTree(10, createDto);

      expect(result.adRequired).toBe(false);
    });

    it('나무가 0개면 adRequired 가 false 다', async () => {
      repository.countTreesByUserId.mockResolvedValue(0);
      repository.findUserPlanCode.mockResolvedValue('FREE');

      const result = await service.createTree(10, createDto);

      expect(result.adRequired).toBe(false);
    });

    it('선택한 mood(이모지)를 저장 계층까지 그대로 전달한다', async () => {
      repository.countTreesByUserId.mockResolvedValue(1);
      repository.findUserPlanCode.mockResolvedValue('FREE');

      await service.createTree(10, createDto);

      expect(repository.createTree).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 10, mood: '😍' }),
      );
    });
  });

  describe('소유권 검증', () => {
    it('존재하지 않는 나무를 조회하면 TREE404 를 던진다', async () => {
      repository.findTreeWithImagesById.mockResolvedValue(null);

      const error = await catchAppError(service.getTree(10, 1));

      expect(error).toBeInstanceOf(AppException);
      expect(error.getResponse()).toMatchObject({ code: 'TREE404' });
    });

    it('타인의 나무를 조회하면 TREE403 을 던진다', async () => {
      repository.findTreeWithImagesById.mockResolvedValue({
        ...treeWithImages,
        userId: 99n,
      });

      const error = await catchAppError(service.getTree(10, 1));

      expect(error.getResponse()).toMatchObject({ code: 'TREE403' });
    });
  });

  describe('updateTree', () => {
    it('수정할 값이 하나도 없으면 TREE400 을 던진다', async () => {
      repository.findTreeById.mockResolvedValue(tree);

      const error = await catchAppError(service.updateTree(10, 1, {}));

      expect(error.getResponse()).toMatchObject({ code: 'TREE400' });
      expect(repository.updateTree).not.toHaveBeenCalled();
    });

    it('본인 나무의 값을 수정한다', async () => {
      repository.findTreeById.mockResolvedValue(tree);
      const dto: UpdateTreeRequestDto = { name: '새 이름' };

      await service.updateTree(10, 1, dto);

      expect(repository.updateTree).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ name: '새 이름' }),
      );
    });
  });

  describe('deleteTree', () => {
    it('본인 나무를 소프트 삭제한다', async () => {
      repository.findTreeById.mockResolvedValue(tree);

      await service.deleteTree(10, 1);

      expect(repository.softDeleteTree).toHaveBeenCalledWith(
        1,
        expect.any(Date),
      );
    });

    it('타인의 나무는 삭제할 수 없다', async () => {
      repository.findTreeById.mockResolvedValue({ ...tree, userId: 99n });

      const error = await catchAppError(service.deleteTree(10, 1));

      expect(error.getResponse()).toMatchObject({ code: 'TREE403' });
      expect(repository.softDeleteTree).not.toHaveBeenCalled();
    });
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
          imageUrl: 'https://example.com/tree.jpg',
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
