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
import { CreateTreeRequestDto } from './dto/create-tree-request.dto';
import { GetNearbyTreesQueryDto } from './dto/get-nearby-trees-query.dto';
import {
  FavoriteTreeListResponseDto,
  ToggleFavoriteResponseDto,
} from './dto/favorite-response.dto';
import { GetTreesQueryDto } from './dto/get-trees-query.dto';
import { NearbyTreeResponseDto } from './dto/nearby-tree-response.dto';
import { TreeListResponseDto } from './dto/tree-list-response.dto';
import {
  CreateTreeResponseDto,
  TreeResponseDto,
} from './dto/tree-response.dto';
import { TreeSummaryStatsResponseDto } from './dto/tree-summary-stats-response.dto';
import { UpdateTreeRequestDto } from './dto/update-tree-request.dto';
import {
  ApiCreateTree,
  ApiDeleteTree,
  ApiGetFavoriteTrees,
  ApiGetNearbyTrees,
  ApiGetMyTrees,
  ApiGetTree,
  ApiGetTreeSummaryStats,
  ApiToggleFavoriteTree,
  ApiUpdateTree,
} from './trees.swagger';
import { TreesService } from './trees.service';

@ApiTags('Trees')
@Controller('trees')
@UseGuards(AccessTokenGuard)
export class TreesController {
  constructor(private readonly treesService: TreesService) {}

  @Post()
  @ApiCreateTree()
  async createTree(
    @CurrentUser() currentUser: JwtPayload,
    @Body() createTreeRequestDto: CreateTreeRequestDto,
  ): Promise<ApiResponse<CreateTreeResponseDto>> {
    const data = await this.treesService.createTree(
      currentUser.userId,
      createTreeRequestDto,
    );

    return ApiResponse.success(SuccessCode.TREE_CREATED, data);
  }

  @Get()
  @ApiGetMyTrees()
  async getMyTrees(
    @CurrentUser() currentUser: JwtPayload,
    @Query() getTreesQueryDto: GetTreesQueryDto,
  ): Promise<ApiResponse<TreeListResponseDto>> {
    const data = await this.treesService.getMyTrees(
      currentUser.userId,
      getTreesQueryDto,
    );

    return ApiResponse.success(SuccessCode.TREE_LIST_RETRIEVED, data);
  }

  @Get('nearby')
  @ApiGetNearbyTrees()
  async getNearbyTrees(
    @CurrentUser() currentUser: JwtPayload,
    @Query() query: GetNearbyTreesQueryDto,
  ): Promise<ApiResponse<NearbyTreeResponseDto[]>> {
    const data = await this.treesService.getNearbyTrees(
      currentUser.userId,
      query,
    );

    return ApiResponse.success(SuccessCode.TREE_NEARBY_RETRIEVED, data);
  }

  @Get('favorites')
  @ApiGetFavoriteTrees()
  async getFavoriteTrees(
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<ApiResponse<FavoriteTreeListResponseDto>> {
    const data = await this.treesService.getFavoriteTrees(currentUser.userId);

    return ApiResponse.success(SuccessCode.FAVORITE_LIST_RETRIEVED, data);
  }

  // ':treeId' 보다 위에 두어야 'summary' 가 나무 ID 로 해석되지 않는다.
  @Get('summary')
  @ApiGetTreeSummaryStats()
  async getSummaryStats(
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<ApiResponse<TreeSummaryStatsResponseDto>> {
    const data = await this.treesService.getSummaryStats(currentUser.userId);

    return ApiResponse.success(SuccessCode.TREE_SUMMARY_RETRIEVED, data);
  }

  @Get(':treeId')
  @ApiGetTree()
  async getTree(
    @CurrentUser() currentUser: JwtPayload,
    @Param('treeId', ParseIntPipe) treeId: number,
  ): Promise<ApiResponse<TreeResponseDto>> {
    const data = await this.treesService.getTree(currentUser.userId, treeId);

    return ApiResponse.success(SuccessCode.TREE_RETRIEVED, data);
  }

  @Patch(':treeId')
  @ApiUpdateTree()
  async updateTree(
    @CurrentUser() currentUser: JwtPayload,
    @Param('treeId', ParseIntPipe) treeId: number,
    @Body() updateTreeRequestDto: UpdateTreeRequestDto,
  ): Promise<ApiResponse<null>> {
    await this.treesService.updateTree(
      currentUser.userId,
      treeId,
      updateTreeRequestDto,
    );

    return ApiResponse.success(SuccessCode.TREE_UPDATED, null);
  }

  @Patch(':treeId/favorite')
  @ApiToggleFavoriteTree()
  async toggleFavorite(
    @CurrentUser() currentUser: JwtPayload,
    @Param('treeId', ParseIntPipe) treeId: number,
  ): Promise<ApiResponse<ToggleFavoriteResponseDto>> {
    const data = await this.treesService.toggleFavorite(
      currentUser.userId,
      treeId,
    );

    return ApiResponse.success(SuccessCode.FAVORITE_TOGGLED, data);
  }

  @Delete(':treeId')
  @ApiDeleteTree()
  async deleteTree(
    @CurrentUser() currentUser: JwtPayload,
    @Param('treeId', ParseIntPipe) treeId: number,
  ): Promise<ApiResponse<null>> {
    await this.treesService.deleteTree(currentUser.userId, treeId);

    return ApiResponse.success(SuccessCode.TREE_DELETED, null);
  }
}
