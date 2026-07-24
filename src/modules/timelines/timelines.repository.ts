import { Injectable } from '@nestjs/common';
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
    },
  },
} as const;

@Injectable()
export class TimelinesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAvailableTreeById = (treeId: bigint) =>
    this.prisma.tree.findFirst({
      where: { id: treeId, deletedAt: null },
      select: { id: true },
    });

  create = (data: CreateTimelineData): Promise<TimelineRecordWithTree> =>
    this.prisma.timelineRecord.create({
      data,
      include: timelineInclude,
    });

  findAllByUser = async (
    userId: bigint,
    skip: number,
    take: number,
  ): Promise<[TimelineRecordWithTree[], number]> => {
    const where = { userId, deletedAt: null };

    return this.prisma.$transaction([
      this.prisma.timelineRecord.findMany({
        where,
        include: timelineInclude,
        orderBy: [{ visitedAt: 'desc' }, { id: 'desc' }],
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
      where: { id: timelineId, userId, deletedAt: null },
      include: timelineInclude,
    });

  update = (
    timelineId: bigint,
    data: UpdateTimelineData,
  ): Promise<TimelineRecordWithTree> =>
    this.prisma.timelineRecord.update({
      where: { id: timelineId },
      data,
      include: timelineInclude,
    });

  softDelete = (timelineId: bigint, deletedAt: Date) =>
    this.prisma.timelineRecord.update({
      where: { id: timelineId },
      data: { deletedAt },
    });
}
