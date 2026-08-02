import { Injectable } from '@nestjs/common';
import { Prisma, TimelineCategory } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateTimelineData,
  TimelineRecordWithTree,
  UpdateTimelineData,
} from './timelines.types';

const timelineInclude = {
  tree: {
    select: {
      id: true,
      name: true,
      mood: true,
      defaultImage: true,
      isFavorite: true,
      images: {
        select: { s3Key: true },
        orderBy: { id: 'asc' },
      },
    },
  },
} as const;

@Injectable()
export class TimelinesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAvailableTreeByIdAndUser = (treeId: bigint, userId: bigint) =>
    this.prisma.tree.findFirst({
      where: { id: treeId, userId, deletedAt: null },
      select: { id: true },
    });

  create = (data: CreateTimelineData): Promise<TimelineRecordWithTree> =>
    this.prisma.$transaction(async (tx) => {
      if (data.treeId !== null && data.treeId !== undefined) {
        // 동일 나무에 대한 생성 요청을 직렬화해 활성 타임라인 중복 생성을 막는다.
        await tx.$queryRaw`
          SELECT id
          FROM trees
          WHERE id = ${data.treeId}
          FOR UPDATE
        `;

        const existing = await tx.timelineRecord.findFirst({
          where: { treeId: data.treeId, deletedAt: null },
          select: { id: true },
        });

        if (existing) {
          await tx.tree.updateMany({
            where: { id: data.treeId, userId: data.userId, deletedAt: null },
            data: { name: data.title, description: data.content },
          });

          return tx.timelineRecord.update({
            where: { id: existing.id },
            data: {
              title: data.title,
              content: data.content,
              category: data.category,
              visitedAt: data.visitedAt,
            },
            include: timelineInclude,
          });
        }
      }

      return tx.timelineRecord.create({
        data,
        include: timelineInclude,
      });
    });

  findAllByUser = async (
    userId: bigint,
    skip: number,
    take: number,
  ): Promise<[TimelineRecordWithTree[], number]> => {
    const where: Prisma.TimelineRecordWhereInput = {
      userId,
      deletedAt: null,
      OR: [{ treeId: null }, { tree: { deletedAt: null } }],
    };

    return this.prisma.$transaction([
      this.prisma.timelineRecord.findMany({
        where,
        include: timelineInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
      this.prisma.timelineRecord.count({ where }),
    ]);
  };

  findByIdAndUser = (
    timelineId: bigint,
    userId: bigint,
  ): Promise<TimelineRecordWithTree | null> =>
    this.prisma.timelineRecord.findFirst({
      where: {
        id: timelineId,
        userId,
        deletedAt: null,
        OR: [{ treeId: null }, { tree: { deletedAt: null } }],
      },
      include: timelineInclude,
    });

  update = (
    timelineId: bigint,
    data: UpdateTimelineData,
  ): Promise<TimelineRecordWithTree | null> =>
    this.prisma.$transaction(async (tx) => {
      const current = await tx.timelineRecord.findUniqueOrThrow({
        where: { id: timelineId },
        select: { treeId: true },
      });

      const targetTreeId =
        data.treeId === undefined ? current.treeId : data.treeId;

      if (targetTreeId !== null) {
        // 대상 나무를 잠근 뒤 충돌 여부를 확인해 이동 요청도 원자적으로 처리한다.
        await tx.$queryRaw`
          SELECT id
          FROM trees
          WHERE id = ${targetTreeId}
          FOR UPDATE
        `;

        if (data.treeId !== undefined && targetTreeId !== current.treeId) {
          const conflict = await tx.timelineRecord.findFirst({
            where: {
              treeId: targetTreeId,
              deletedAt: null,
              id: { not: timelineId },
            },
            select: { id: true },
          });

          if (conflict) {
            return null;
          }
        }
      }

      const timeline = await tx.timelineRecord.update({
        where: { id: timelineId },
        data,
        select: {
          treeId: true,
          title: true,
          content: true,
          category: true,
        },
      });

      const shouldSyncTree =
        timeline.treeId !== null &&
        timeline.category === TimelineCategory.VISIT &&
        (data.treeId !== undefined ||
          data.title !== undefined ||
          data.content !== undefined ||
          data.category !== undefined);

      if (shouldSyncTree && timeline.treeId !== null) {
        await tx.tree.updateMany({
          where: { id: timeline.treeId, deletedAt: null },
          data: { name: timeline.title, description: timeline.content },
        });
      }

      return tx.timelineRecord.findUniqueOrThrow({
        where: { id: timelineId },
        include: timelineInclude,
      });
    });

  softDelete = (timelineId: bigint, deletedAt: Date) =>
    this.prisma.timelineRecord.update({
      where: { id: timelineId },
      data: { deletedAt },
    });
}
