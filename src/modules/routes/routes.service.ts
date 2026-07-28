import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code';
import { S3Service } from '../../common/s3/s3.service';
import { CreateRouteRequestDto } from './dto/create-route-request.dto';
import { GetRoutesQueryDto } from './dto/get-routes-query.dto';
import { RouteImageListResponseDto } from './dto/route-image-response.dto';
import { RouteListResponseDto } from './dto/route-list-response.dto';
import {
  CreateRouteResponseDto,
  RouteResponseDto,
  RouteSummaryResponseDto,
} from './dto/route-response.dto';
import { UpdateRouteRequestDto } from './dto/update-route-request.dto';
import { RoutePagination } from './routes.constant';
import { RoutesRepository } from './routes.repository';
import {
  RouteListItemRecord,
  RouteRecord,
  RouteWithPointsRecord,
} from './routes.types';

@Injectable()
export class RoutesService {
  constructor(
    private readonly routesRepository: RoutesRepository,
    private readonly s3Service: S3Service,
  ) {}

  createRoute = async (
    userId: number,
    createRouteRequestDto: CreateRouteRequestDto,
  ): Promise<CreateRouteResponseDto> => {
    await this.ensureTreesOwned(userId, createRouteRequestDto.points);

    const route = await this.routesRepository.createRoute({
      userId,
      routeName: createRouteRequestDto.routeName,
      points: createRouteRequestDto.points.map((point) => ({
        treeId: point.treeId,
        sequence: point.sequence,
      })),
    });

    return {
      routeId: Number(route.id),
    };
  };

  getMyRoutes = async (
    userId: number,
    getRoutesQueryDto: GetRoutesQueryDto,
  ): Promise<RouteListResponseDto> => {
    const page = getRoutesQueryDto.page ?? RoutePagination.DEFAULT_PAGE;
    const size = getRoutesQueryDto.size ?? RoutePagination.DEFAULT_SIZE;

    const [routes, total] = await this.routesRepository.findRoutesByUserId(
      userId,
      page,
      size,
    );

    return {
      items: routes.map(this.toRouteSummaryResponseDto),
      page,
      size,
      total,
      totalPages: Math.ceil(total / size),
    };
  };

  getRoute = async (
    userId: number,
    routeId: number,
  ): Promise<RouteResponseDto> => {
    const route = await this.getOwnedRouteWithPointsOrThrow(userId, routeId);

    return this.toRouteResponseDto(route);
  };

  updateRoute = async (
    userId: number,
    routeId: number,
    updateRouteRequestDto: UpdateRouteRequestDto,
  ): Promise<null> => {
    await this.getOwnedRouteOrThrow(userId, routeId);
    this.validateUpdateRequest(updateRouteRequestDto);

    await this.routesRepository.updateRoute(routeId, {
      routeName: updateRouteRequestDto.routeName,
    });

    return null;
  };

  deleteRoute = async (userId: number, routeId: number): Promise<null> => {
    await this.getOwnedRouteOrThrow(userId, routeId);

    await this.routesRepository.deleteRoute(routeId);

    return null;
  };

  getRouteImages = async (
    userId: number,
    routeId: number,
  ): Promise<RouteImageListResponseDto> => {
    await this.getOwnedRouteOrThrow(userId, routeId);

    const points =
      await this.routesRepository.findRoutePointsWithImages(routeId);

    // 소프트 삭제된 나무는 제외. 사진 없는 장소는 imageUrl=null (프론트에서 로고 표시).
    const images = await Promise.all(
      points
        .filter((point) => point.tree.deletedAt === null)
        .map(async (point) => ({
          treeId: Number(point.tree.id),
          name: point.tree.name,
          imageUrl:
            point.tree.images.length > 0
              ? await this.s3Service.getPresignedUrl(point.tree.images[0].s3Key)
              : null,
        })),
    );

    return { images };
  };

  // 동선 노드로 넘어온 나무가 모두 본인 소유이면서 살아있는지 검증한다.
  private ensureTreesOwned = async (
    userId: number,
    points: CreateRouteRequestDto['points'],
  ): Promise<void> => {
    const treeIds = [...new Set(points.map((point) => point.treeId))];
    const ownedCount = await this.routesRepository.countOwnedTrees(
      treeIds,
      userId,
    );

    if (ownedCount !== treeIds.length) {
      throw new AppException(ErrorCode.ROUTE_INVALID_REQUEST);
    }
  };

  private getOwnedRouteOrThrow = async (
    userId: number,
    routeId: number,
  ): Promise<RouteRecord> => {
    const route = await this.routesRepository.findRouteById(routeId);

    return this.ensureOwnership(route, userId);
  };

  private getOwnedRouteWithPointsOrThrow = async (
    userId: number,
    routeId: number,
  ): Promise<RouteWithPointsRecord> => {
    const route = await this.routesRepository.findRouteWithPointsById(routeId);

    return this.ensureOwnership(route, userId);
  };

  private ensureOwnership = <T extends RouteRecord>(
    route: T | null,
    userId: number,
  ): T => {
    if (!route) {
      throw new AppException(ErrorCode.ROUTE_NOT_FOUND);
    }

    if (Number(route.userId) !== userId) {
      throw new AppException(ErrorCode.ROUTE_FORBIDDEN);
    }

    return route;
  };

  private validateUpdateRequest = (
    updateRouteRequestDto: UpdateRouteRequestDto,
  ): void => {
    const hasUpdateValue = Object.values(updateRouteRequestDto).some(
      (value) => value !== undefined,
    );

    if (!hasUpdateValue) {
      throw new AppException(ErrorCode.ROUTE_INVALID_REQUEST);
    }
  };

  // UTC 저장값을 KST(UTC+9) 기준 YYYY-MM-DD 로 변환한다.
  private toKstDateString = (date: Date): string => {
    const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    return kst.toISOString().slice(0, 10);
  };

  private toRouteSummaryResponseDto = (
    route: RouteListItemRecord,
  ): RouteSummaryResponseDto => {
    // 소프트 삭제된 나무는 카드에서 제외한다.
    const livePoints = route.points.filter(
      (point) => point.tree.deletedAt === null,
    );
    // 기록 날짜: 동선에 속한 장소들 중 가장 이른 기록일 (KST 기준 날짜)
    const recordDate =
      livePoints.length > 0
        ? this.toKstDateString(
            [...livePoints].sort(
              (a, b) => a.tree.createdAt.getTime() - b.tree.createdAt.getTime(),
            )[0].tree.createdAt,
          )
        : null;

    return {
      routeId: Number(route.id),
      routeName: route.routeName,
      recordDate,
      placeCount: livePoints.length,
      places: livePoints.map((point) => ({
        name: point.tree.name,
        mood: point.tree.mood,
      })),
      createdAt: route.createdAt,
    };
  };

  private toRouteResponseDto = (
    route: RouteWithPointsRecord,
  ): RouteResponseDto => ({
    routeId: Number(route.id),
    routeName: route.routeName,
    createdAt: route.createdAt,
    // 소프트 삭제된 나무는 동선에서 제외한다.
    points: route.points
      .filter((point) => point.tree.deletedAt === null)
      .map((point) => ({
        treeId: Number(point.tree.id),
        name: point.tree.name,
        mood: point.tree.mood,
        description: point.tree.description,
        latitude: Number(point.tree.latitude),
        longitude: Number(point.tree.longitude),
        sequence: point.sequence,
      })),
  });
}
