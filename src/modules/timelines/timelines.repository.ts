import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
  ): Promise<TimelineRecordWithTree> =>
    this.prisma.$transaction(async (tx) => {
      const timeline = await tx.timelineRecord.update({
        where: { id: timelineId },
        data,
        select: { treeId: true },
      });

      if (timeline.treeId !== null) {
        const treeData: Prisma.TreeUpdateManyMutationInput = {};
        if (data.title !== undefined) {
          treeData.name = data.title;
        }
        if (data.content !== undefined) {
          treeData.description = data.content;
        }
        if (Object.keys(treeData).length > 0) {
          await tx.tree.updateMany({
            where: { id: timeline.treeId, deletedAt: null },
            data: treeData,
          });
        }
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
