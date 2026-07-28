import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateRouteData,
  RouteListItemRecord,
  RoutePointImageRecord,
  RouteRecord,
  RouteWithPointsRecord,
  UpdateRouteData,
} from './routes.types';

@Injectable()
export class RoutesRepository {
  constructor(private readonly prisma: PrismaService) {}

  createRoute = (createRouteData: CreateRouteData): Promise<RouteRecord> => {
    return this.prisma.route.create({
      data: {
        userId: BigInt(createRouteData.userId),
        routeName: createRouteData.routeName,
        points: {
          create: createRouteData.points.map((point) => ({
            treeId: BigInt(point.treeId),
            sequence: point.sequence,
          })),
        },
      },
    });
  };

  // 동선 생성 시 검증용: 본인 소유이면서 삭제되지 않은 나무 개수
  countOwnedTrees = (treeIds: number[], userId: number): Promise<number> => {
    return this.prisma.tree.count({
      where: {
        id: { in: treeIds.map((id) => BigInt(id)) },
        userId: BigInt(userId),
        deletedAt: null,
      },
    });
  };

  findRoutesByUserId = (
    userId: number,
    page: number,
    size: number,
  ): Promise<[RouteListItemRecord[], number]> => {
    const where: Prisma.RouteWhereInput = {
      userId: BigInt(userId),
    };

    return Promise.all([
      this.prisma.route.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * size,
        take: size,
        include: {
          points: {
            orderBy: { sequence: 'asc' },
            select: {
              sequence: true,
              tree: {
                select: {
                  name: true,
                  mood: true,
                  createdAt: true,
                  deletedAt: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.route.count({ where }),
    ]);
  };

  findRouteById = (routeId: number): Promise<RouteRecord | null> => {
    return this.prisma.route.findUnique({
      where: {
        id: BigInt(routeId),
      },
    });
  };

  findRouteWithPointsById = (
    routeId: number,
  ): Promise<RouteWithPointsRecord | null> => {
    return this.prisma.route.findUnique({
      where: {
        id: BigInt(routeId),
      },
      include: {
        points: {
          orderBy: {
            sequence: 'asc',
          },
          select: {
            sequence: true,
            tree: {
              select: {
                id: true,
                name: true,
                mood: true,
                description: true,
                latitude: true,
                longitude: true,
                deletedAt: true,
              },
            },
          },
        },
      },
    });
  };

  // 동선 사진 앨범: 노드를 방문 순서로, 각 나무의 대표 사진(timelineRecordId=null) 1장 포함
  findRoutePointsWithImages = (
    routeId: number,
  ): Promise<RoutePointImageRecord[]> => {
    return this.prisma.routePoint.findMany({
      where: { routeId: BigInt(routeId) },
      orderBy: { sequence: 'asc' },
      select: {
        tree: {
          select: {
            id: true,
            name: true,
            deletedAt: true,
            images: {
              where: { timelineRecordId: null },
              orderBy: { id: 'asc' },
              take: 1,
              select: { s3Key: true },
            },
          },
        },
      },
    });
  };

  updateRoute = (
    routeId: number,
    updateRouteData: UpdateRouteData,
  ): Promise<RouteRecord> => {
    return this.prisma.route.update({
      where: {
        id: BigInt(routeId),
      },
      data: updateRouteData,
    });
  };

  // route_points 는 onDelete: Cascade 로 함께 삭제된다
  deleteRoute = (routeId: number): Promise<RouteRecord> => {
    return this.prisma.route.delete({
      where: {
        id: BigInt(routeId),
      },
    });
  };
}
