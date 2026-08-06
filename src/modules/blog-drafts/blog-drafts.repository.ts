import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BlogDraftGenerateSource,
  BlogDraftRecord,
  BlogDraftSummaryRecord,
  BlogDraftTreeImageRecord,
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
            startedAt: true,
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

  consumeUsageWithinLimit = async (
    userId: bigint,
    start: Date,
    end: Date,
    limit: number,
  ): Promise<void> => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await this.prisma.$transaction(
          async (tx) => {
            const used = await tx.blogDraftUsage.count({
              where: {
                userId,
                createdAt: {
                  gte: start,
                  lt: end,
                },
              },
            });

            if (used >= limit) {
              throw new Error('BLOG_DRAFT_LIMIT_EXCEEDED');
            }

            await tx.blogDraftUsage.create({
              data: {
                userId,
              },
            });
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          },
        );

        return;
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === 'BLOG_DRAFT_LIMIT_EXCEEDED'
        ) {
          throw error;
        }

        const prismaError = error as { code?: string } | null;

        if (prismaError?.code === 'P2034' && attempt < 2) {
          continue;
        }

        throw error;
      }
    }
  };

  createDraft = (data: CreateBlogDraftData): Promise<BlogDraftRecord> => {
    return this.prisma.blogDraft.create({
      data: {
        userId: data.userId,
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
        content: true,
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

  findTreeImagesByIds = (
    userId: number,
    treeIds: number[],
  ): Promise<BlogDraftTreeImageRecord[]> => {
    return this.prisma.tree.findMany({
      where: {
        userId: BigInt(userId),
        deletedAt: null,
        id: {
          in: treeIds.map((treeId) => BigInt(treeId)),
        },
      },
      select: {
        id: true,
        createdAt: true,
        images: {
          where: {
            timelineRecordId: null,
          },
          select: {
            s3Key: true,
          },
          orderBy: {
            sortOrder: 'asc',
          },
          take: 1,
        },
      },
    });
  };

  deleteDraft = (
    draftId: number,
    userId: number,
  ): Promise<{ count: number }> => {
    return this.prisma.blogDraft.deleteMany({
      where: {
        id: BigInt(draftId),
        userId: BigInt(userId),
      },
    });
  };
}
