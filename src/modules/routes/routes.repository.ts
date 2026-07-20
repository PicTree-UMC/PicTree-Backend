import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateRouteData,
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
        totalDistanceM: createRouteData.totalDistanceM,
        startedAt: createRouteData.startedAt,
        endedAt: createRouteData.endedAt,
        points: {
          create: createRouteData.points.map((point) => ({
            latitude: point.latitude,
            longitude: point.longitude,
            sequence: point.sequence,
            recordedAt: point.recordedAt,
          })),
        },
      },
    });
  };

  findRoutesByUserId = (
    userId: number,
    page: number,
    size: number,
  ): Promise<[RouteRecord[], number]> => {
    const where: Prisma.RouteWhereInput = {
      userId: BigInt(userId),
    };

    return Promise.all([
      this.prisma.route.findMany({
        where,
        orderBy: {
          startedAt: 'desc',
        },
        skip: (page - 1) * size,
        take: size,
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
