import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

  createTree = (createTreeData: CreateTreeData): Promise<TreeRecord> => {
    return this.prisma.tree.create({
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
  };

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
            orderBy: { sortOrder: 'asc' },
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
  ): Promise<TreeRecord> => {
    return this.prisma.tree.update({
      where: {
        id: BigInt(treeId),
      },
      data: updateTreeData,
    });
  };

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

  softDeleteTree = (treeId: number, deletedAt: Date): Promise<TreeRecord> => {
    return this.prisma.tree.update({
      where: {
        id: BigInt(treeId),
      },
      data: { deletedAt },
    });
  };

  countTreesByUserId = (userId: number): Promise<number> => {
    return this.prisma.tree.count({
      where: {
        userId: BigInt(userId),
        deletedAt: null,
      },
    });
  };

  // 마이페이지 통계용: 살아있는 나무에 속한 사진의 개수와 총 용량
  aggregateImageUsageByUserId = async (
    userId: number,
  ): Promise<{ imageCount: number; usedBytes: number }> => {
    const result = await this.prisma.treeImage.aggregate({
      where: {
        tree: {
          userId: BigInt(userId),
          deletedAt: null,
        },
      },
      _count: { _all: true },
      _sum: { fileSize: true },
    });

    return {
      imageCount: result._count._all,
      usedBytes: Number(result._sum.fileSize ?? 0n),
    };
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
