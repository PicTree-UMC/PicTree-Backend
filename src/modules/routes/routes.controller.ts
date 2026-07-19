import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../../common/responses/api.response';
import { SuccessCode } from '../../common/responses/success-code';
import { AccessTokenGuard } from '../auth/access-token.guard';
import type { JwtPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateRouteRequestDto } from './dto/create-route-request.dto';
import { GetRoutesQueryDto } from './dto/get-routes-query.dto';
import { RouteListResponseDto } from './dto/route-list-response.dto';
import {
  CreateRouteResponseDto,
  RouteResponseDto,
} from './dto/route-response.dto';
import { UpdateRouteRequestDto } from './dto/update-route-request.dto';
import { RoutesService } from './routes.service';
import {
  ApiCreateRoute,
  ApiDeleteRoute,
  ApiGetMyRoutes,
  ApiGetRoute,
  ApiUpdateRoute,
} from './routes.swagger';

@ApiTags('Routes')
@Controller('routes')
@UseGuards(AccessTokenGuard)
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Post()
  @ApiCreateRoute()
  async createRoute(
    @CurrentUser() currentUser: JwtPayload,
    @Body() createRouteRequestDto: CreateRouteRequestDto,
  ): Promise<ApiResponse<CreateRouteResponseDto>> {
    const data = await this.routesService.createRoute(
      currentUser.userId,
      createRouteRequestDto,
    );

    return ApiResponse.success(SuccessCode.CREATED, data);
  }

  @Get()
  @ApiGetMyRoutes()
  async getMyRoutes(
    @CurrentUser() currentUser: JwtPayload,
    @Query() getRoutesQueryDto: GetRoutesQueryDto,
  ): Promise<ApiResponse<RouteListResponseDto>> {
    const data = await this.routesService.getMyRoutes(
      currentUser.userId,
      getRoutesQueryDto,
    );

    return ApiResponse.success(SuccessCode.OK, data);
  }

  @Get(':routeId')
  @ApiGetRoute()
  async getRoute(
    @CurrentUser() currentUser: JwtPayload,
    @Param('routeId', ParseIntPipe) routeId: number,
  ): Promise<ApiResponse<RouteResponseDto>> {
    const data = await this.routesService.getRoute(currentUser.userId, routeId);

    return ApiResponse.success(SuccessCode.OK, data);
  }

  @Patch(':routeId')
  @ApiUpdateRoute()
  async updateRoute(
    @CurrentUser() currentUser: JwtPayload,
    @Param('routeId', ParseIntPipe) routeId: number,
    @Body() updateRouteRequestDto: UpdateRouteRequestDto,
  ): Promise<ApiResponse<null>> {
    await this.routesService.updateRoute(
      currentUser.userId,
      routeId,
      updateRouteRequestDto,
    );

    return ApiResponse.success(SuccessCode.OK, null);
  }

  @Delete(':routeId')
  @ApiDeleteRoute()
  async deleteRoute(
    @CurrentUser() currentUser: JwtPayload,
    @Param('routeId', ParseIntPipe) routeId: number,
  ): Promise<ApiResponse<null>> {
    await this.routesService.deleteRoute(currentUser.userId, routeId);

    return ApiResponse.success(SuccessCode.OK, null);
  }
}
