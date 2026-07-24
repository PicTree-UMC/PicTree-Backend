import { TimelineCategory } from '@prisma/client';
import { AppException } from '../../common/exceptions/app.exception';
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
    },
  };

  let repository: jest.Mocked<TimelinesRepository>;
  let service: TimelinesService;

  beforeEach(() => {
    repository = {
      findAvailableTreeById: jest.fn(),
      create: jest.fn(),
      findAllByUser: jest.fn(),
      findByIdAndUser: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    } as unknown as jest.Mocked<TimelinesRepository>;
    service = new TimelinesService(repository);
  });

  it('타임라인을 생성한다', async () => {
    repository.findAvailableTreeById.mockResolvedValue({ id: 2n });
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
    expect(result).toMatchObject({ id: 1, userId: 10, treeId: 2 });
  });

  it('존재하지 않는 나무로 타임라인을 생성할 수 없다', async () => {
    repository.findAvailableTreeById.mockResolvedValue(null);

    await expect(
      service.create(10, {
        treeId: 999,
        title: timeline.title,
        category: timeline.category,
        visitedAt: timeline.visitedAt.toISOString(),
      }),
    ).rejects.toBeInstanceOf(AppException);
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

  it('본인의 타임라인을 soft delete 한다', async () => {
    repository.findByIdAndUser.mockResolvedValue(timeline);
    repository.softDelete.mockResolvedValue({
      ...timeline,
      deletedAt: new Date(),
    });

    await expect(service.remove(10, 1)).resolves.toBeNull();
    expect(repository.softDelete).toHaveBeenCalledWith(1n, expect.any(Date));
  });
});
