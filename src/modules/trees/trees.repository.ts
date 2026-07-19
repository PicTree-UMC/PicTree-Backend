import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FREE_PLAN_CODE } from './trees.constant';
import {
  CreateTreeData,
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
  ): Promise<[TreeRecord[], number]> => {
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
          orderBy: {
            sortOrder: 'asc',
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
}
