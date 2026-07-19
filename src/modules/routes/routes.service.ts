import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code';
import { CreateRouteRequestDto } from './dto/create-route-request.dto';
import { GetRoutesQueryDto } from './dto/get-routes-query.dto';
import { RouteListResponseDto } from './dto/route-list-response.dto';
import {
  CreateRouteResponseDto,
  RouteResponseDto,
  RouteSummaryResponseDto,
} from './dto/route-response.dto';
import { UpdateRouteRequestDto } from './dto/update-route-request.dto';
import { RoutePagination } from './routes.constant';
import { RoutesRepository } from './routes.repository';
import { RouteRecord, RouteWithPointsRecord } from './routes.types';

@Injectable()
export class RoutesService {
  constructor(private readonly routesRepository: RoutesRepository) {}

  createRoute = async (
    userId: number,
    createRouteRequestDto: CreateRouteRequestDto,
  ): Promise<CreateRouteResponseDto> => {
    const route = await this.routesRepository.createRoute({
      userId,
      routeName: createRouteRequestDto.routeName,
      totalDistanceM: createRouteRequestDto.totalDistanceM ?? null,
      startedAt: createRouteRequestDto.startedAt,
      endedAt: createRouteRequestDto.endedAt ?? null,
      points: createRouteRequestDto.points.map((point) => ({
        latitude: point.latitude,
        longitude: point.longitude,
        sequence: point.sequence,
        recordedAt: point.recordedAt,
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

  private toRouteSummaryResponseDto = (
    route: RouteRecord,
  ): RouteSummaryResponseDto => ({
    routeId: Number(route.id),
    routeName: route.routeName,
    totalDistanceM: route.totalDistanceM,
    startedAt: route.startedAt,
  });

  private toRouteResponseDto = (
    route: RouteWithPointsRecord,
  ): RouteResponseDto => ({
    routeId: Number(route.id),
    routeName: route.routeName,
    totalDistanceM: route.totalDistanceM,
    startedAt: route.startedAt,
    endedAt: route.endedAt,
    points: route.points.map((point) => ({
      latitude: Number(point.latitude),
      longitude: Number(point.longitude),
      sequence: point.sequence,
    })),
  });
}
