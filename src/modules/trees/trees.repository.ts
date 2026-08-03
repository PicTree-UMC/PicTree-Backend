import { Injectable } from '@nestjs/common';
import { Prisma, TimelineCategory } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FREE_PLAN_CODE } from './trees.constant';
import {
  CreateTreeData,
  FavoriteTreeRecord,
  NearbyTreeRecord,
  TreeListItemRecord,
  TreeRecord,
  TreeWithImagesRecord,
  UpdateTreeData,
} from './trees.types';

@Injectable()
export class TreesRepository {
  constructor(private readonly prisma: PrismaService) {}

  createTree = (createTreeData: CreateTreeData): Promise<TreeRecord> =>
    this.prisma.$transaction(async (tx) => {
      const tree = await tx.tree.create({
        data: {
          userId: BigInt(createTreeData.userId),
          name: createTreeData.name,
          description: createTreeData.description,
          latitude: createTreeData.latitude,
          longitude: createTreeData.longitude,
          address: createTreeData.address,
          mood: createTreeData.mood,
          defaultImage: createTreeData.defaultImage,
        },
      });

      await tx.timelineRecord.create({
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

      return tree;
    });

  findTreesByUserId = (
    userId: number,
    page: number,
    size: number,
  ): Promise<[TreeListItemRecord[], number]> => {
    const where: Prisma.TreeWhereInput = {
      userId: BigInt(userId),
      deletedAt: null,
    };

    return Promise.all([
      this.prisma.tree.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * size,
        take: size,
        // 목록 카드에 노출할 대표 사진(타임라인에 속하지 않은 사진) 1장
        include: {
          images: {
            where: { timelineRecordId: null },
            orderBy: { id: 'asc' },
            take: 1,
            select: { s3Key: true },
          },
        },
      }),
      this.prisma.tree.count({ where }),
    ]);
  };

  findTreeById = (treeId: number): Promise<TreeRecord | null> => {
    return this.prisma.tree.findFirst({
      where: {
        id: BigInt(treeId),
        deletedAt: null,
      },
    });
  };

  findFavoriteTreesByUserId = (
    userId: number,
  ): Promise<FavoriteTreeRecord[]> => {
    return this.prisma.tree
      .findMany({
        where: {
          userId: BigInt(userId),
          isFavorite: true,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          images: {
            select: {
              id: true,
              timelineRecordId: true,
              s3Key: true,
            },
            orderBy: {
              id: 'asc',
            },
            take: 1,
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      })
      .then((trees) =>
        trees.map((tree) => ({
          id: tree.id,
          name: tree.name,
          description: tree.description,
          createdAt: tree.createdAt,
          image: tree.images[0] ?? null,
        })),
      );
  };

  findTreeWithImagesById = (
    treeId: number,
  ): Promise<TreeWithImagesRecord | null> => {
    return this.prisma.tree.findFirst({
      where: {
        id: BigInt(treeId),
        deletedAt: null,
      },
      include: {
        images: {
          select: {
            id: true,
            timelineRecordId: true,
            s3Key: true,
          },
          orderBy: {
            id: 'asc',
          },
        },
      },
    });
  };

  updateTree = (
    treeId: number,
    updateTreeData: UpdateTreeData,
  ): Promise<TreeRecord> =>
    this.prisma.$transaction(async (tx) => {
      const tree = await tx.tree.update({
        where: { id: BigInt(treeId) },
        data: updateTreeData,
      });

      const timelineData: Prisma.TimelineRecordUpdateManyMutationInput = {};
      if (updateTreeData.name !== undefined) {
        timelineData.title = updateTreeData.name;
      }
      if (updateTreeData.description !== undefined) {
        timelineData.content = updateTreeData.description;
      }

      if (Object.keys(timelineData).length > 0) {
        await tx.timelineRecord.updateMany({
          where: {
            treeId: tree.id,
            category: TimelineCategory.VISIT,
            deletedAt: null,
          },
          data: timelineData,
        });
      }

      return tree;
    });

  updateFavoriteStatus = (
    treeId: number,
    isFavorite: boolean,
  ): Promise<TreeRecord> => {
    return this.prisma.tree.update({
      where: {
        id: BigInt(treeId),
      },
      data: {
        isFavorite,
      },
    });
  };

  // 나무 삭제 시 정리할 사진들 (타임라인에 연결된 사진 포함)
  findImageKeysByTreeId = (treeId: number): Promise<{ s3Key: string }[]> => {
    return this.prisma.treeImage.findMany({
      where: { treeId: BigInt(treeId) },
      select: { s3Key: true },
    });
  };

  // S3 객체를 지운 뒤 호출한다. 나무는 소프트 삭제라 Cascade 가 동작하지 않는다.
  deleteImagesByTreeId = (treeId: number): Promise<{ count: number }> => {
    return this.prisma.treeImage.deleteMany({
      where: { treeId: BigInt(treeId) },
    });
  };

  softDeleteTree = (treeId: number, deletedAt: Date): Promise<TreeRecord> =>
    this.prisma.$transaction(async (tx) => {
      await tx.timelineRecord.updateMany({
        where: { treeId: BigInt(treeId), deletedAt: null },
        data: { deletedAt },
      });

      return tx.tree.update({
        where: { id: BigInt(treeId) },
        data: { deletedAt },
      });
    });

  countTreesByUserId = (userId: number): Promise<number> => {
    return this.prisma.tree.count({
      where: {
        userId: BigInt(userId),
        deletedAt: null,
      },
    });
  };

  findUserPlanCode = async (userId: number): Promise<string> => {
    const user = await this.prisma.user.findUnique({
      where: {
        id: BigInt(userId),
      },
      select: {
        currentSubscription: {
          select: {
            subscriptionPlan: {
              select: { code: true },
            },
          },
        },
      },
    });

    return user?.currentSubscription?.subscriptionPlan.code ?? FREE_PLAN_CODE;
  };

  findNearbyTrees = (
    userId: number,
    latitude: number,
    longitude: number,
    radiusM: number,
  ): Promise<NearbyTreeRecord[]> =>
    this.prisma.$queryRaw<NearbyTreeRecord[]>(Prisma.sql`
      SELECT
        id,
        name,
        latitude,
        longitude,
        mood,
        default_image AS defaultImage,
        ST_Distance_Sphere(
          POINT(longitude, latitude),
          POINT(${longitude}, ${latitude})
        ) AS distanceM
      FROM trees
      WHERE deleted_at IS NULL
        AND user_id = ${userId}
      HAVING distanceM <= ${radiusM}
      ORDER BY distanceM ASC, id ASC
    `);
}
