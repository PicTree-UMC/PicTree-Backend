import { Prisma, TimelineCategory } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TreesRepository } from './trees.repository';

describe('TreesRepository 나무-타임라인 동기화', () => {
  const tree = {
    id: 1n,
    userId: 10n,
    name: '벚나무',
    description: '산책로 입구',
    latitude: new Prisma.Decimal(37.5665),
    longitude: new Prisma.Decimal(126.978),
    address: null,
    isFavorite: false,
    mood: '😍',
    defaultImage: 'DEFAULT_1',
    createdAt: new Date('2026-08-02T01:00:00.000Z'),
    updatedAt: new Date('2026-08-02T01:00:00.000Z'),
    deletedAt: null,
  };

  const tx = {
    tree: {
      create: jest.fn(),
      update: jest.fn(),
    },
    timelineRecord: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const prisma = {
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  } as unknown as PrismaService;
  const repository = new TreesRepository(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    tx.tree.create.mockResolvedValue(tree);
    tx.tree.update.mockResolvedValue(tree);
    tx.timelineRecord.create.mockResolvedValue({});
    tx.timelineRecord.updateMany.mockResolvedValue({ count: 1 });
  });

  it('나무를 생성할 때 타임라인을 같은 트랜잭션에서 생성한다', async () => {
    await repository.createTree({
      userId: 10,
      name: tree.name,
      description: tree.description,
      latitude: 37.5665,
      longitude: 126.978,
      address: null,
      mood: tree.mood,
      defaultImage: tree.defaultImage,
    });

    expect(tx.timelineRecord.create).toHaveBeenCalledWith({
      data: {
        userId: tree.userId,
        treeId: tree.id,
        title: tree.name,
        content: tree.description,
        category: TimelineCategory.VISIT,
        visitedAt: tree.createdAt,
        createdAt: tree.createdAt,
      },
    });
  });

  it('나무 이름·설명을 수정하면 타임라인도 수정한다', async () => {
    await repository.updateTree(1, {
      name: '수정된 이름',
      description: '수정된 설명',
    });

    expect(tx.timelineRecord.updateMany).toHaveBeenCalledWith({
      where: {
        treeId: 1n,
        category: TimelineCategory.VISIT,
        deletedAt: null,
      },
      data: { title: '수정된 이름', content: '수정된 설명' },
    });
  });

  it('나무를 삭제하면 연결된 타임라인도 같은 시간으로 삭제한다', async () => {
    const deletedAt = new Date('2026-08-02T02:00:00.000Z');

    await repository.softDeleteTree(1, deletedAt);

    expect(tx.timelineRecord.updateMany).toHaveBeenCalledWith({
      where: { treeId: 1n, deletedAt: null },
      data: { deletedAt },
    });
    expect(tx.tree.update).toHaveBeenCalledWith({
      where: { id: 1n },
      data: { deletedAt },
    });
  });
});
