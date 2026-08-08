import { Injectable, Logger } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code';
import { S3Service } from '../../common/s3/s3.service';
import { formatKstDate } from '../../common/utils/kst-date.util';
import { CreateTreeRequestDto } from './dto/create-tree-request.dto';
import { GetNearbyTreesQueryDto } from './dto/get-nearby-trees-query.dto';
import {
  FavoriteTreeListResponseDto,
  FavoriteTreeResponseDto,
  ToggleFavoriteResponseDto,
} from './dto/favorite-response.dto';
import { GetTreesQueryDto } from './dto/get-trees-query.dto';
import { NearbyTreeResponseDto } from './dto/nearby-tree-response.dto';
import { TreeListResponseDto } from './dto/tree-list-response.dto';
import {
  CreateTreeResponseDto,
  TreeImageResponseDto,
  TreeResponseDto,
  TreeSummaryResponseDto,
} from './dto/tree-response.dto';
import { TreeSummaryStatsResponseDto } from './dto/tree-summary-stats-response.dto';
import { UpdateTreeRequestDto } from './dto/update-tree-request.dto';
import {
  AD_INTERVAL,
  DEFAULT_TREE_IMAGE,
  FREE_PLAN_CODE,
  NEARBY_TREE_RADIUS_M,
  TreePagination,
} from './trees.constant';
import { TreesRepository } from './trees.repository';
import {
  FavoriteTreeRecord,
  TreeListItemRecord,
  TreeRecord,
  TreeWithImagesRecord,
} from './trees.types';

@Injectable()
export class TreesService {
  private readonly logger = new Logger(TreesService.name);

  constructor(
    private readonly treesRepository: TreesRepository,
    private readonly s3Service: S3Service,
  ) {}

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
      defaultImage: createTreeRequestDto.defaultImage ?? DEFAULT_TREE_IMAGE,
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
      items: await Promise.all(
        trees.map((tree) => this.toTreeSummaryResponseDto(tree)),
      ),
      page,
      size,
      total,
      totalPages: Math.ceil(total / size),
    };
  };

  getSummaryStats = async (
    userId: number,
  ): Promise<TreeSummaryStatsResponseDto> => {
    const [treeCount, imageUsage] = await Promise.all([
      this.treesRepository.countTreesByUserId(userId),
      this.treesRepository.aggregateImageUsageByUserId(userId),
    ]);

    return {
      treeCount,
      imageCount: imageUsage.imageCount,
      usedBytes: imageUsage.usedBytes,
    };
  };

  getTree = async (
    userId: number,
    treeId: number,
  ): Promise<TreeResponseDto> => {
    const tree = await this.getOwnedTreeWithImagesOrThrow(userId, treeId);

    return this.toTreeResponseDto(tree);
  };

  getFavoriteTrees = async (
    userId: number,
  ): Promise<FavoriteTreeListResponseDto> => {
    const favorites =
      await this.treesRepository.findFavoriteTreesByUserId(userId);

    return {
      count: favorites.length,
      favorites: await Promise.all(
        favorites.map((favorite) => this.toFavoriteTreeResponseDto(favorite)),
      ),
    };
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

    // 나무는 소프트 삭제라 Cascade 가 동작하지 않으므로 사진을 직접 정리한다.
    // 타임라인에 연결된 사진도 함께 지워지며, 타임라인 기록 자체는 유지된다.
    await this.deleteTreeImages(treeId);

    await this.treesRepository.softDeleteTree(treeId, new Date());

    return null;
  };

  private deleteTreeImages = async (treeId: number): Promise<void> => {
    const images = await this.treesRepository.findImageKeysByTreeId(treeId);

    if (images.length === 0) {
      return;
    }

    // S3 삭제가 실패해도 나무 삭제는 계속 진행한다. 실패한 키는 로그로 남겨
    // 나중에 고아 객체를 추적·정리할 수 있게 한다.
    const failedKeys: string[] = [];
    await Promise.all(
      images.map((image) =>
        this.s3Service.delete(image.s3Key).catch(() => {
          failedKeys.push(image.s3Key);
        }),
      ),
    );

    if (failedKeys.length > 0) {
      this.logger.warn(
        `나무(${treeId}) 삭제 중 S3 객체 삭제 실패: ${failedKeys.join(', ')}`,
      );
    }

    await this.treesRepository.deleteImagesByTreeId(treeId);
  };

  getNearbyTrees = async (
    userId: number,
    query: GetNearbyTreesQueryDto,
  ): Promise<NearbyTreeResponseDto[]> => {
    const trees = await this.treesRepository.findNearbyTrees(
      userId,
      query.lat,
      query.lng,
      NEARBY_TREE_RADIUS_M,
    );

    return trees.map((tree) => ({
      treeId: Number(tree.id),
      name: tree.name,
      latitude: Number(tree.latitude),
      longitude: Number(tree.longitude),
      mood: tree.mood,
      defaultImage: tree.defaultImage,
      distanceM: Math.round(Number(tree.distanceM)),
    }));
  };

  toggleFavorite = async (
    userId: number,
    treeId: number,
  ): Promise<ToggleFavoriteResponseDto> => {
    const tree = await this.getOwnedTreeOrThrow(userId, treeId);
    const updated = await this.treesRepository.updateFavoriteStatus(
      treeId,
      !tree.isFavorite,
    );

    return {
      treeId: Number(updated.id),
      isFavorite: updated.isFavorite,
    };
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

  private toTreeSummaryResponseDto = async (
    tree: TreeListItemRecord,
  ): Promise<TreeSummaryResponseDto> => ({
    treeId: Number(tree.id),
    name: tree.name,
    description: tree.description,
    latitude: Number(tree.latitude),
    longitude: Number(tree.longitude),
    mood: tree.mood,
    defaultImage: tree.defaultImage,
    // 사진이 있으면 presigned URL, 없으면 null (프론트에서 기본 이미지 표시)
    imageUrl:
      tree.images.length > 0
        ? await this.s3Service.getPresignedUrl(tree.images[0].s3Key)
        : null,
    isFavorite: tree.isFavorite,
    createdAt: tree.createdAt,
  });

  private toTreeResponseDto = async (
    tree: TreeWithImagesRecord,
  ): Promise<TreeResponseDto> => ({
    treeId: Number(tree.id),
    name: tree.name,
    description: tree.description,
    latitude: Number(tree.latitude),
    longitude: Number(tree.longitude),
    address: tree.address,
    mood: tree.mood,
    defaultImage: tree.defaultImage,
    isFavorite: tree.isFavorite,
    images: await Promise.all(
      tree.images.map((image) => this.toTreeImageResponseDto(image)),
    ),
    createdAt: tree.createdAt,
    updatedAt: tree.updatedAt,
  });

  private toFavoriteTreeResponseDto = async (
    tree: FavoriteTreeRecord,
  ): Promise<FavoriteTreeResponseDto> => {
    return {
      treeId: Number(tree.id),
      name: tree.name,
      description: tree.description,
      createdAt: formatKstDate(tree.createdAt),
      // 버킷이 private 이므로 조회용 임시 서명 URL 을 발급한다.
      imageUrl: tree.image
        ? await this.s3Service.getPresignedUrl(tree.image.s3Key)
        : null,
    };
  };

  private toTreeImageResponseDto = async (
    image: TreeWithImagesRecord['images'][number],
  ): Promise<TreeImageResponseDto> => ({
    imageId: Number(image.id),
    // 버킷이 private 이므로 원본 URL 대신 presigned URL 을 내려준다.
    imageUrl: await this.s3Service.getPresignedUrl(image.s3Key),
    timelineRecordId:
      image.timelineRecordId === null ? null : Number(image.timelineRecordId),
  });
}
