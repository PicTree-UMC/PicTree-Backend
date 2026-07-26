import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateTreeImageData,
  TreeImageRecord,
  TreeOwnerRecord,
} from './tree-images.types';

@Injectable()
export class TreeImagesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findTreeById = (treeId: number): Promise<TreeOwnerRecord | null> => {
    return this.prisma.tree.findFirst({
      where: { id: BigInt(treeId), deletedAt: null },
      select: { id: true, userId: true },
    });
  };

  findMaxSortOrder = async (treeId: number): Promise<number> => {
    const result = await this.prisma.treeImage.aggregate({
      where: { treeId: BigInt(treeId) },
      _max: { sortOrder: true },
    });

    return result._max.sortOrder ?? -1;
  };

  createMany = (
    createTreeImageData: CreateTreeImageData[],
  ): Promise<TreeImageRecord[]> => {
    return this.prisma.$transaction(
      createTreeImageData.map((data) =>
        this.prisma.treeImage.create({
          data: {
            treeId: BigInt(data.treeId),
            timelineRecordId:
              data.timelineRecordId === null
                ? null
                : BigInt(data.timelineRecordId),
            imageUrl: data.imageUrl,
            s3Key: data.s3Key,
            fileSize: BigInt(data.fileSize),
            sortOrder: data.sortOrder,
          },
        }),
      ),
    );
  };

  findByTreeId = (
    treeId: number,
    timelineRecordId?: number,
  ): Promise<TreeImageRecord[]> => {
    const where: Prisma.TreeImageWhereInput = {
      treeId: BigInt(treeId),
      ...(timelineRecordId
        ? { timelineRecordId: BigInt(timelineRecordId) }
        : {}),
    };

    return this.prisma.treeImage.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
  };

  findByIdAndTreeId = (
    imageId: number,
    treeId: number,
  ): Promise<TreeImageRecord | null> => {
    return this.prisma.treeImage.findFirst({
      where: { id: BigInt(imageId), treeId: BigInt(treeId) },
    });
  };

  deleteById = (imageId: number): Promise<TreeImageRecord> => {
    return this.prisma.treeImage.delete({
      where: { id: BigInt(imageId) },
    });
  };
}
