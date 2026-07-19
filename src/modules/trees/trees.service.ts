import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code';
import { CreateTreeRequestDto } from './dto/create-tree-request.dto';
import { GetTreesQueryDto } from './dto/get-trees-query.dto';
import { TreeListResponseDto } from './dto/tree-list-response.dto';
import {
  CreateTreeResponseDto,
  TreeResponseDto,
  TreeSummaryResponseDto,
} from './dto/tree-response.dto';
import { UpdateTreeRequestDto } from './dto/update-tree-request.dto';
import { AD_INTERVAL, FREE_PLAN_CODE, TreePagination } from './trees.constant';
import { TreesRepository } from './trees.repository';
import { TreeRecord, TreeWithImagesRecord } from './trees.types';

@Injectable()
export class TreesService {
  constructor(private readonly treesRepository: TreesRepository) {}

  createTree = async (
    userId: number,
    createTreeRequestDto: CreateTreeRequestDto,
  ): Promise<CreateTreeResponseDto> => {
    const tree = await this.treesRepository.createTree({
      userId,
      name: createTreeRequestDto.name,
      description: createTreeRequestDto.description ?? null,
      latitude: createTreeRequestDto.latitude,
      longitude: createTreeRequestDto.longitude,
      address: createTreeRequestDto.address ?? null,
      mood: createTreeRequestDto.mood,
      defaultImage: createTreeRequestDto.defaultImage,
    });

    const adRequired = await this.resolveAdRequired(userId);

    return {
      treeId: Number(tree.id),
      adRequired,
    };
  };

  getMyTrees = async (
    userId: number,
    getTreesQueryDto: GetTreesQueryDto,
  ): Promise<TreeListResponseDto> => {
    const page = getTreesQueryDto.page ?? TreePagination.DEFAULT_PAGE;
    const size = getTreesQueryDto.size ?? TreePagination.DEFAULT_SIZE;

    const [trees, total] = await this.treesRepository.findTreesByUserId(
      userId,
      page,
      size,
    );

    return {
      items: trees.map(this.toTreeSummaryResponseDto),
      page,
      size,
      total,
      totalPages: Math.ceil(total / size),
    };
  };

  getTree = async (
    userId: number,
    treeId: number,
  ): Promise<TreeResponseDto> => {
    const tree = await this.getOwnedTreeWithImagesOrThrow(userId, treeId);

    return this.toTreeResponseDto(tree);
  };

  updateTree = async (
    userId: number,
    treeId: number,
    updateTreeRequestDto: UpdateTreeRequestDto,
  ): Promise<null> => {
    await this.getOwnedTreeOrThrow(userId, treeId);
    this.validateUpdateRequest(updateTreeRequestDto);

    await this.treesRepository.updateTree(treeId, {
      name: updateTreeRequestDto.name,
      description: updateTreeRequestDto.description,
      address: updateTreeRequestDto.address,
      mood: updateTreeRequestDto.mood,
      defaultImage: updateTreeRequestDto.defaultImage,
    });

    return null;
  };

  deleteTree = async (userId: number, treeId: number): Promise<null> => {
    await this.getOwnedTreeOrThrow(userId, treeId);

    await this.treesRepository.softDeleteTree(treeId, new Date());

    return null;
  };

  private resolveAdRequired = async (userId: number): Promise<boolean> => {
    const [treeCount, planCode] = await Promise.all([
      this.treesRepository.countTreesByUserId(userId),
      this.treesRepository.findUserPlanCode(userId),
    ]);

    return (
      treeCount > 0 &&
      treeCount % AD_INTERVAL === 0 &&
      planCode === FREE_PLAN_CODE
    );
  };

  private getOwnedTreeOrThrow = async (
    userId: number,
    treeId: number,
  ): Promise<TreeRecord> => {
    const tree = await this.treesRepository.findTreeById(treeId);

    return this.ensureOwnership(tree, userId);
  };

  private getOwnedTreeWithImagesOrThrow = async (
    userId: number,
    treeId: number,
  ): Promise<TreeWithImagesRecord> => {
    const tree = await this.treesRepository.findTreeWithImagesById(treeId);

    return this.ensureOwnership(tree, userId);
  };

  private ensureOwnership = <T extends TreeRecord>(
    tree: T | null,
    userId: number,
  ): T => {
    if (!tree) {
      throw new AppException(ErrorCode.TREE_NOT_FOUND);
    }

    if (Number(tree.userId) !== userId) {
      throw new AppException(ErrorCode.TREE_FORBIDDEN);
    }

    return tree;
  };

  private validateUpdateRequest = (
    updateTreeRequestDto: UpdateTreeRequestDto,
  ): void => {
    const hasUpdateValue = Object.values(updateTreeRequestDto).some(
      (value) => value !== undefined,
    );

    if (!hasUpdateValue) {
      throw new AppException(ErrorCode.TREE_INVALID_REQUEST);
    }
  };

  private toTreeSummaryResponseDto = (
    tree: TreeRecord,
  ): TreeSummaryResponseDto => ({
    treeId: Number(tree.id),
    name: tree.name,
    latitude: Number(tree.latitude),
    longitude: Number(tree.longitude),
    mood: tree.mood,
    defaultImage: tree.defaultImage,
    isFavorite: tree.isFavorite,
  });

  private toTreeResponseDto = (
    tree: TreeWithImagesRecord,
  ): TreeResponseDto => ({
    treeId: Number(tree.id),
    name: tree.name,
    description: tree.description,
    latitude: Number(tree.latitude),
    longitude: Number(tree.longitude),
    address: tree.address,
    mood: tree.mood,
    defaultImage: tree.defaultImage,
    isFavorite: tree.isFavorite,
    images: tree.images.map((image) => ({
      imageId: Number(image.id),
      imageUrl: image.imageUrl,
      timelineRecordId:
        image.timelineRecordId === null ? null : Number(image.timelineRecordId),
      sortOrder: image.sortOrder,
    })),
    createdAt: tree.createdAt,
    updatedAt: tree.updatedAt,
  });
}
