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
import { GetTreesQueryDto } from './dto/get-trees-query.dto';
import { TreeListResponseDto } from './dto/tree-list-response.dto';
import {
  CreateTreeResponseDto,
  TreeResponseDto,
} from './dto/tree-response.dto';
import { UpdateTreeRequestDto } from './dto/update-tree-request.dto';
import {
  ApiCreateTree,
  ApiDeleteTree,
  ApiGetMyTrees,
  ApiGetTree,
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

    return ApiResponse.success(SuccessCode.CREATED, data);
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

    return ApiResponse.success(SuccessCode.OK, data);
  }

  @Get(':treeId')
  @ApiGetTree()
  async getTree(
    @CurrentUser() currentUser: JwtPayload,
    @Param('treeId', ParseIntPipe) treeId: number,
  ): Promise<ApiResponse<TreeResponseDto>> {
    const data = await this.treesService.getTree(currentUser.userId, treeId);

    return ApiResponse.success(SuccessCode.OK, data);
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

    return ApiResponse.success(SuccessCode.OK, null);
  }

  @Delete(':treeId')
  @ApiDeleteTree()
  async deleteTree(
    @CurrentUser() currentUser: JwtPayload,
    @Param('treeId', ParseIntPipe) treeId: number,
  ): Promise<ApiResponse<null>> {
    await this.treesService.deleteTree(currentUser.userId, treeId);

    return ApiResponse.success(SuccessCode.OK, null);
  }
}
