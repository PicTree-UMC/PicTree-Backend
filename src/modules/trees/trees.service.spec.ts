import { Prisma } from '@prisma/client';
import { AppException } from '../../common/exceptions/app.exception';
import { S3Service } from '../../common/s3/s3.service';
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
    createdAt: new Date('2026-03-30T15:30:00.000Z'),
    image: {
      s3Key: 'trees/1/a.jpg',
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
  let s3Service: jest.Mocked<S3Service>;
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
      findImageKeysByTreeId: jest.fn(),
      deleteImagesByTreeId: jest.fn(),
      softDeleteTree: jest.fn(),
      countTreesByUserId: jest.fn(),
      findUserPlanCode: jest.fn(),
      aggregateImageUsageByUserId: jest.fn(),
      countTreesCreatedBetween: jest.fn(),
    } as unknown as jest.Mocked<TreesRepository>;

    s3Service = {
      upload: jest.fn(),
      delete: jest.fn(),
      getPresignedUrl: jest.fn(),
    } as unknown as jest.Mocked<S3Service>;

    s3Service.getPresignedUrl.mockImplementation((key) =>
      Promise.resolve(`https://signed/${key}`),
    );

    service = new TreesService(repository, s3Service);
  });

  describe('createTree - 하루 등록 제한', () => {
    it('하루 한도(20개)에 도달하면 TREE429 를 던진다', async () => {
      repository.countTreesCreatedBetween.mockResolvedValue(20);

      const error = await catchAppError(service.createTree(10, createDto));

      expect(error.getResponse()).toMatchObject({ code: 'TREE429' });
      expect(repository.createTree).not.toHaveBeenCalled();
    });

    it('한도 미만이면 정상 등록한다', async () => {
      repository.countTreesCreatedBetween.mockResolvedValue(19);
      repository.createTree.mockResolvedValue(tree);
      repository.countTreesByUserId.mockResolvedValue(1);
      repository.findUserPlanCode.mockResolvedValue('FREE');

      const result = await service.createTree(10, createDto);

      expect(result.treeId).toBe(1);
    });

    it('KST 하루 구간으로 당일 등록 수를 센다', async () => {
      // UTC 2026-01-01 05:00 = KST 2026-01-01 14:00.
      // UTC 기준으로 구간을 잡으면 start 가 2026-01-01T00:00Z 가 되므로,
      // KST 자정(= 전날 15:00Z)을 검증하면 두 기준을 확실히 구분할 수 있다.
      jest.useFakeTimers().setSystemTime(new Date('2026-01-01T05:00:00.000Z'));

      try {
        repository.countTreesCreatedBetween.mockResolvedValue(0);
        repository.createTree.mockResolvedValue(tree);
        repository.countTreesByUserId.mockResolvedValue(1);
        repository.findUserPlanCode.mockResolvedValue('FREE');

        await service.createTree(10, createDto);

        const [userId, start, end] =
          repository.countTreesCreatedBetween.mock.calls[0];
        expect(userId).toBe(10);
        expect(start).toEqual(new Date('2025-12-31T15:00:00.000Z'));
        expect(end).toEqual(new Date('2026-01-01T15:00:00.000Z'));
        expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('createTree - adRequired', () => {
    beforeEach(() => {
      repository.createTree.mockResolvedValue(tree);
      repository.countTreesCreatedBetween.mockResolvedValue(0);
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

    it('defaultImage 를 생략하면 서버 기본값을 적용한다', async () => {
      repository.countTreesByUserId.mockResolvedValue(1);
      repository.findUserPlanCode.mockResolvedValue('FREE');
      const dtoWithoutImage: CreateTreeRequestDto = {
        name: '벚나무',
        latitude: 37.5665,
        longitude: 126.978,
        mood: '😍',
      };

      await service.createTree(10, dtoWithoutImage);

      expect(repository.createTree).toHaveBeenCalledWith(
        expect.objectContaining({ defaultImage: 'DEFAULT_1' }),
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

  describe('getSummaryStats', () => {
    it('나무 수·사진 수·저장 용량을 반환한다', async () => {
      repository.countTreesByUserId.mockResolvedValue(2);
      repository.aggregateImageUsageByUserId.mockResolvedValue({
        imageCount: 2,
        usedBytes: 33382,
      });

      const result = await service.getSummaryStats(10);

      expect(repository.countTreesByUserId).toHaveBeenCalledWith(10);
      expect(repository.aggregateImageUsageByUserId).toHaveBeenCalledWith(10);
      expect(result).toEqual({
        treeCount: 2,
        imageCount: 2,
        usedBytes: 33382,
      });
    });

    it('사진이 없으면 개수와 용량이 0 이다', async () => {
      repository.countTreesByUserId.mockResolvedValue(1);
      repository.aggregateImageUsageByUserId.mockResolvedValue({
        imageCount: 0,
        usedBytes: 0,
      });

      const result = await service.getSummaryStats(10);

      expect(result).toEqual({ treeCount: 1, imageCount: 0, usedBytes: 0 });
    });
  });

  describe('deleteTree', () => {
    it('본인 나무를 소프트 삭제한다', async () => {
      repository.findTreeById.mockResolvedValue(tree);
      repository.findImageKeysByTreeId.mockResolvedValue([]);

      await service.deleteTree(10, 1);

      expect(repository.softDeleteTree).toHaveBeenCalledWith(
        1,
        expect.any(Date),
      );
    });

    it('나무의 사진을 S3 와 DB 에서 함께 삭제한다', async () => {
      repository.findTreeById.mockResolvedValue(tree);
      repository.findImageKeysByTreeId.mockResolvedValue([
        { s3Key: 'trees/1/a.jpg' },
        { s3Key: 'trees/1/b.jpg' },
      ]);
      s3Service.delete.mockResolvedValue(undefined);

      await service.deleteTree(10, 1);

      expect(s3Service.delete).toHaveBeenCalledWith('trees/1/a.jpg');
      expect(s3Service.delete).toHaveBeenCalledWith('trees/1/b.jpg');
      expect(repository.deleteImagesByTreeId).toHaveBeenCalledWith(1);
      expect(repository.softDeleteTree).toHaveBeenCalled();

      // S3 객체 삭제 → 사진 레코드 삭제 → 나무 소프트 삭제 순서를 보장한다.
      const lastS3Call = Math.max(...s3Service.delete.mock.invocationCallOrder);
      const imageDeleteCall =
        repository.deleteImagesByTreeId.mock.invocationCallOrder[0];
      const treeDeleteCall =
        repository.softDeleteTree.mock.invocationCallOrder[0];

      expect(lastS3Call).toBeLessThan(imageDeleteCall);
      expect(imageDeleteCall).toBeLessThan(treeDeleteCall);
    });

    it('사진이 없으면 삭제를 시도하지 않는다', async () => {
      repository.findTreeById.mockResolvedValue(tree);
      repository.findImageKeysByTreeId.mockResolvedValue([]);

      await service.deleteTree(10, 1);

      expect(s3Service.delete).not.toHaveBeenCalled();
      expect(repository.deleteImagesByTreeId).not.toHaveBeenCalled();
    });

    it('S3 삭제가 실패해도 나무 삭제는 계속 진행한다', async () => {
      repository.findTreeById.mockResolvedValue(tree);
      repository.findImageKeysByTreeId.mockResolvedValue([
        { s3Key: 'trees/1/a.jpg' },
      ]);
      s3Service.delete.mockRejectedValue(new Error('s3 error'));

      await service.deleteTree(10, 1);

      expect(s3Service.delete).toHaveBeenCalledWith('trees/1/a.jpg');
      expect(repository.deleteImagesByTreeId).toHaveBeenCalledWith(1);
      expect(repository.softDeleteTree).toHaveBeenCalled();
    });

    it('타인의 나무는 삭제할 수 없다', async () => {
      repository.findTreeById.mockResolvedValue({ ...tree, userId: 99n });

      const error = await catchAppError(service.deleteTree(10, 1));

      expect(error.getResponse()).toMatchObject({ code: 'TREE403' });
      expect(repository.softDeleteTree).not.toHaveBeenCalled();
    });
  });

  describe('getMyTrees', () => {
    it('사진이 있으면 목록에 presigned URL 을 반환한다', async () => {
      repository.findTreesByUserId.mockResolvedValue([
        [{ ...tree, images: [{ s3Key: 'trees/1/a.jpg' }] }],
        1,
      ]);

      const result = await service.getMyTrees(10, {});

      expect(s3Service.getPresignedUrl).toHaveBeenCalledWith('trees/1/a.jpg');
      expect(result.items[0].imageUrl).toBe('https://signed/trees/1/a.jpg');
    });

    it('목록 항목에 한줄평과 등록일을 포함한다', async () => {
      repository.findTreesByUserId.mockResolvedValue([
        [{ ...tree, images: [] }],
        1,
      ]);

      const result = await service.getMyTrees(10, {});

      expect(result.items[0].description).toBe('길 가다가 오아시스 자만추');
      expect(result.items[0].createdAt).toEqual(tree.createdAt);
    });

    it('사진이 없으면 imageUrl 은 null 이다', async () => {
      repository.findTreesByUserId.mockResolvedValue([
        [{ ...tree, images: [] }],
        1,
      ]);

      const result = await service.getMyTrees(10, {});

      expect(result.items[0].imageUrl).toBeNull();
      expect(s3Service.getPresignedUrl).not.toHaveBeenCalled();
    });
  });

  it('나무 상세의 사진 URL 을 presigned 로 발급한다', async () => {
    repository.findTreeWithImagesById.mockResolvedValue({
      ...treeWithImages,
      images: [{ id: 11n, timelineRecordId: null, s3Key: 'trees/1/a.jpg' }],
    });

    const result = await service.getTree(10, 1);

    expect(s3Service.getPresignedUrl).toHaveBeenCalledWith('trees/1/a.jpg');
    expect(result.images).toEqual([
      {
        imageId: 11,
        imageUrl: 'https://signed/trees/1/a.jpg',
        timelineRecordId: null,
      },
    ]);
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
          createdAt: '2026-03-31',
          imageUrl: 'https://signed/trees/1/a.jpg',
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
