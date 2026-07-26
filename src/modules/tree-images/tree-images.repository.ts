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

  // 나무(또는 타임라인 기록)당 사진은 1장이므로, 기존 사진을 찾아 교체 대상으로 삼는다.
  findByTreeAndTimeline = (
    treeId: number,
    timelineRecordId: number | null,
  ): Promise<TreeImageRecord | null> => {
    return this.prisma.treeImage.findFirst({
      where: {
        treeId: BigInt(treeId),
        timelineRecordId:
          timelineRecordId === null ? null : BigInt(timelineRecordId),
      },
    });
  };

  // 기존 사진이 있으면 지우고 새 사진을 만든다(교체). 두 작업을 한 트랜잭션으로 묶는다.
  replace = (
    oldImageId: bigint | null,
    data: CreateTreeImageData,
  ): Promise<TreeImageRecord> => {
    return this.prisma.$transaction(async (tx) => {
      if (oldImageId !== null) {
        await tx.treeImage.delete({ where: { id: oldImageId } });
      }

      return tx.treeImage.create({
        data: {
          treeId: BigInt(data.treeId),
          timelineRecordId:
            data.timelineRecordId === null
              ? null
              : BigInt(data.timelineRecordId),
          imageUrl: data.imageUrl,
          s3Key: data.s3Key,
          fileSize: BigInt(data.fileSize),
          // 사진 1장 정책이라 정렬 개념이 없어 0으로 고정한다.
          sortOrder: 0,
        },
      });
    });
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
      orderBy: { id: 'asc' },
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
