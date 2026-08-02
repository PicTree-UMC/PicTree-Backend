import { TimelineCategory } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TimelinesRepository } from './timelines.repository';

describe('TimelinesRepository 나무-타임라인 무결성', () => {
  const timeline = {
    id: 1n,
    userId: 10n,
    treeId: 2n,
    title: '오아시스 만난 곳',
    content: '즐겁게 산책했다.',
    category: TimelineCategory.VISIT,
    visitedAt: new Date('2026-08-02T01:00:00.000Z'),
    createdAt: new Date('2026-08-02T01:00:00.000Z'),
    updatedAt: new Date('2026-08-02T01:00:00.000Z'),
    deletedAt: null,
    tree: null,
  };

  const tx = {
    $queryRaw: jest.fn(),
    timelineRecord: {
      findFirst: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    tree: {
      updateMany: jest.fn(),
    },
  };
  const prisma = {
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  } as unknown as PrismaService;
  const repository = new TimelinesRepository(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    tx.$queryRaw.mockResolvedValue([]);
    tx.timelineRecord.findFirst.mockResolvedValue(null);
    tx.timelineRecord.create.mockResolvedValue(timeline);
    tx.timelineRecord.update.mockResolvedValue(timeline);
    tx.timelineRecord.findUniqueOrThrow
      .mockResolvedValueOnce({ treeId: 1n })
      .mockResolvedValue(timeline);
    tx.tree.updateMany.mockResolvedValue({ count: 1 });
  });

  it('타임라인 생성 전 나무 행을 잠가 동시 중복 생성을 직렬화한다', async () => {
    await repository.create({
      userId: 10n,
      treeId: 2n,
      title: timeline.title,
      content: timeline.content,
      category: TimelineCategory.VISIT,
      visitedAt: timeline.visitedAt,
    });

    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.timelineRecord.findFirst.mock.invocationCallOrder[0],
    );
    expect(tx.timelineRecord.create).toHaveBeenCalledTimes(1);
  });

  it('연결 나무만 변경해도 최종 타임라인 제목과 내용으로 대상 나무를 동기화한다', async () => {
    tx.timelineRecord.update.mockResolvedValue({
      treeId: 2n,
      title: timeline.title,
      content: timeline.content,
      category: TimelineCategory.VISIT,
    });

    await repository.update(1n, { treeId: 2n });

    expect(tx.timelineRecord.findFirst).toHaveBeenCalledWith({
      where: {
        treeId: 2n,
        deletedAt: null,
        id: { not: 1n },
      },
      select: { id: true },
    });
    expect(tx.tree.updateMany).toHaveBeenCalledWith({
      where: { id: 2n, deletedAt: null },
      data: { name: timeline.title, description: timeline.content },
    });
  });

  it('대상 나무에 다른 활성 타임라인이 있으면 연결 변경을 거부한다', async () => {
    tx.timelineRecord.findFirst.mockResolvedValue({ id: 99n });

    await expect(repository.update(1n, { treeId: 2n })).resolves.toBeNull();
    expect(tx.timelineRecord.update).not.toHaveBeenCalled();
    expect(tx.tree.updateMany).not.toHaveBeenCalled();
  });

  it('VISIT이 아닌 기록은 나무 정보를 변경하지 않는다', async () => {
    tx.timelineRecord.update.mockResolvedValue({
      treeId: 1n,
      title: timeline.title,
      content: timeline.content,
      category: TimelineCategory.ETC,
    });

    await repository.update(1n, { title: '회상 기록' });

    expect(tx.tree.updateMany).not.toHaveBeenCalled();
  });
});
