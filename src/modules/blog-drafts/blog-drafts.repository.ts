import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BlogDraftGenerateSource,
  BlogDraftRecord,
  BlogDraftSummaryRecord,
  BlogDraftUserRecord,
  CreateBlogDraftData,
} from './blog-drafts.types';

@Injectable()
export class BlogDraftsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserById = (userId: number): Promise<BlogDraftUserRecord | null> => {
    return this.prisma.user.findUnique({
      where: {
        id: BigInt(userId),
      },
      select: {
        id: true,
        status: true,
        currentSubscription: {
          select: {
            expiresAt: true,
            subscriptionPlan: {
              select: {
                code: true,
              },
            },
          },
        },
      },
    });
  };

  countGeneratedDraftsInRange = (
    userId: number,
    start: Date,
    end: Date,
  ): Promise<number> => {
    return this.prisma.blogDraftUsage.count({
      where: {
        userId: BigInt(userId),
        createdAt: {
          gte: start,
          lt: end,
        },
      },
    });
  };

  findGenerateSource = async (
    userId: number,
    start: Date,
    end: Date,
    treeIds: number[],
  ): Promise<BlogDraftGenerateSource> => {
    const [trees, timelines] = await this.prisma.$transaction([
      this.prisma.tree.findMany({
        where: {
          userId: BigInt(userId),
          deletedAt: null,
          id: {
            in: treeIds.map((treeId) => BigInt(treeId)),
          },
        },
        include: {
          images: {
            where: {
              timelineRecordId: null,
            },
            orderBy: {
              sortOrder: 'asc',
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),
      this.prisma.timelineRecord.findMany({
        where: {
          userId: BigInt(userId),
          deletedAt: null,
          treeId: {
            in: treeIds.map((treeId) => BigInt(treeId)),
          },
          visitedAt: {
            gte: start,
            lt: end,
          },
        },
        include: {
          tree: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          visitedAt: 'asc',
        },
      }),
    ]);

    return { trees, timelines };
  };

  createUsage = (userId: number): Promise<{ id: bigint }> => {
    return this.prisma.blogDraftUsage.create({
      data: {
        userId: BigInt(userId),
      },
      select: {
        id: true,
      },
    });
  };

  createDraft = (data: CreateBlogDraftData): Promise<BlogDraftRecord> => {
    return this.prisma.blogDraft.create({
      data: {
        userId: BigInt(data.userId),
        title: data.title,
        content: data.content,
        startDate: data.startDate,
        endDate: data.endDate,
      },
    });
  };

  findSavedDraftsByUserId = (
    userId: number,
  ): Promise<BlogDraftSummaryRecord[]> => {
    return this.prisma.blogDraft.findMany({
      where: {
        userId: BigInt(userId),
      },
      select: {
        id: true,
        title: true,
        startDate: true,
        endDate: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  };

  findDraftByIdAndUserId = (
    draftId: number,
    userId: number,
  ): Promise<BlogDraftRecord | null> => {
    return this.prisma.blogDraft.findFirst({
      where: {
        id: BigInt(draftId),
        userId: BigInt(userId),
      },
    });
  };

  deleteDraft = (draftId: number): Promise<BlogDraftRecord> => {
    return this.prisma.blogDraft.delete({
      where: {
        id: BigInt(draftId),
      },
    });
  };
}
