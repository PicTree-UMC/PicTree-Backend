import { TimelineCategory } from '@prisma/client';
import { AppException } from '../../common/exceptions/app.exception';
import { S3Service } from '../../common/s3/s3.service';
import { TreesService } from '../trees/trees.service';
import { TimelinesRepository } from './timelines.repository';
import { TimelinesService } from './timelines.service';
import { TimelineRecordWithTree } from './timelines.types';

describe('TimelinesService', () => {
  const timeline: TimelineRecordWithTree = {
    id: 1n,
    userId: 10n,
    treeId: 2n,
    title: '오아시스 만난 곳',
    content: '즐겁게 산책했다.',
    category: TimelineCategory.VISIT,
    visitedAt: new Date('2026-07-16T09:30:00.000Z'),
    createdAt: new Date('2026-07-16T10:00:00.000Z'),
    updatedAt: new Date('2026-07-16T10:00:00.000Z'),
    deletedAt: null,
    tree: {
      id: 2n,
      name: '오아시스 나무',
      mood: 'HAPPY',
      defaultImage: 'DEFAULT_1',
      isFavorite: true,
      images: [{ s3Key: 'trees/2/a.jpg' }],
    },
  };

  let repository: jest.Mocked<TimelinesRepository>;
  let treesService: jest.Mocked<TreesService>;
  let s3Service: jest.Mocked<S3Service>;
  let service: TimelinesService;

  beforeEach(() => {
    repository = {
      findAvailableTreeByIdAndUser: jest.fn(),
      create: jest.fn(),
      findAllByUser: jest.fn(),
      findByIdAndUser: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    } as unknown as jest.Mocked<TimelinesRepository>;
    treesService = {
      deleteTree: jest.fn(),
    } as unknown as jest.Mocked<TreesService>;
    s3Service = {
      getPresignedUrl: jest.fn((key: string) =>
        Promise.resolve(`https://signed/${key}`),
      ),
    } as unknown as jest.Mocked<S3Service>;
    service = new TimelinesService(repository, treesService, s3Service);
  });

  it('타임라인을 생성한다', async () => {
    repository.findAvailableTreeByIdAndUser.mockResolvedValue({ id: 2n });
    repository.create.mockResolvedValue(timeline);

    const result = await service.create(10, {
      treeId: 2,
      title: timeline.title,
      content: timeline.content,
      category: timeline.category,
      visitedAt: timeline.visitedAt.toISOString(),
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 10n, treeId: 2n }),
    );
    expect(repository.findAvailableTreeByIdAndUser).toHaveBeenCalledWith(
      2n,
      10n,
    );
    expect(result).toMatchObject({ id: 1, userId: 10, treeId: 2 });
    expect(result.tree).toMatchObject({
      isFavorite: true,
      imageUrls: ['https://signed/trees/2/a.jpg'],
    });
  });

  it('존재하지 않거나 다른 사용자의 나무로 타임라인을 생성할 수 없다', async () => {
    repository.findAvailableTreeByIdAndUser.mockResolvedValue(null);

    await expect(
      service.create(10, {
        treeId: 999,
        title: timeline.title,
        category: timeline.category,
        visitedAt: timeline.visitedAt.toISOString(),
      }),
    ).rejects.toBeInstanceOf(AppException);
    expect(repository.findAvailableTreeByIdAndUser).toHaveBeenCalledWith(
      999n,
      10n,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('사용자의 타임라인을 페이지 단위로 조회한다', async () => {
    repository.findAllByUser.mockResolvedValue([[timeline], 21]);

    const result = await service.findAll(10, { page: 2, size: 20 });

    expect(repository.findAllByUser).toHaveBeenCalledWith(10n, 20, 20);
    expect(result).toMatchObject({
      page: 2,
      size: 20,
      totalElements: 21,
      totalPages: 2,
      hasNext: false,
    });
  });

  it('다른 사용자이거나 존재하지 않는 타임라인은 조회할 수 없다', async () => {
    repository.findByIdAndUser.mockResolvedValue(null);

    await expect(service.findOne(10, 999)).rejects.toBeInstanceOf(AppException);
  });

  it('수정할 값이 없는 요청을 거부한다', async () => {
    await expect(service.update(10, 1, {})).rejects.toBeInstanceOf(
      AppException,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('나무와 연결된 타임라인을 삭제하면 나무도 삭제한다', async () => {
    repository.findByIdAndUser.mockResolvedValue(timeline);
    treesService.deleteTree.mockResolvedValue(null);

    await expect(service.remove(10, 1)).resolves.toBeNull();
    expect(treesService.deleteTree).toHaveBeenCalledWith(10, 2);
    expect(repository.softDelete).not.toHaveBeenCalled();
  });

  it('나무와 연결되지 않은 기존 타임라인만 soft delete 한다', async () => {
    repository.findByIdAndUser.mockResolvedValue({
      ...timeline,
      treeId: null,
      tree: null,
    });
    repository.softDelete.mockResolvedValue({
      ...timeline,
      treeId: null,
      tree: null,
      deletedAt: new Date(),
    });

    await expect(service.remove(10, 1)).resolves.toBeNull();
    expect(repository.softDelete).toHaveBeenCalledWith(1n, expect.any(Date));
    expect(treesService.deleteTree).not.toHaveBeenCalled();
  });
});
