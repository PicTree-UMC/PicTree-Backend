import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code';
import { S3Service } from '../../common/s3/s3.service';
import { TreesService } from '../trees/trees.service';
import { CreateTimelineRequestDto } from './dto/create-timeline-request.dto';
import {
  TimelineListResponseDto,
  TimelineResponseDto,
} from './dto/timeline-response.dto';
import { TimelineQueryDto } from './dto/timeline-query.dto';
import { UpdateTimelineRequestDto } from './dto/update-timeline-request.dto';
import { TimelinesRepository } from './timelines.repository';
import { TimelineRecordWithTree, UpdateTimelineData } from './timelines.types';

@Injectable()
export class TimelinesService {
  constructor(
    private readonly timelinesRepository: TimelinesRepository,
    private readonly treesService: TreesService,
    private readonly s3Service: S3Service,
  ) {}

  create = async (
    userId: number,
    request: CreateTimelineRequestDto,
  ): Promise<TimelineResponseDto> => {
    await this.validateTree(userId, request.treeId);

    const timeline = await this.timelinesRepository.create({
      userId: BigInt(userId),
      treeId: request.treeId == null ? null : BigInt(request.treeId),
      title: request.title,
      content: request.content,
      category: request.category,
      visitedAt: new Date(request.visitedAt),
    });

    return this.toResponseDto(timeline);
  };

  findAll = async (
    userId: number,
    query: TimelineQueryDto,
  ): Promise<TimelineListResponseDto> => {
    const skip = (query.page - 1) * query.size;
    const [timelines, totalElements] =
      await this.timelinesRepository.findAllByUser(
        BigInt(userId),
        skip,
        query.size,
      );
    const totalPages = Math.ceil(totalElements / query.size);

    return {
      items: await Promise.all(
        timelines.map((timeline) => this.toResponseDto(timeline)),
      ),
      page: query.page,
      size: query.size,
      totalElements,
      totalPages,
      hasNext: query.page < totalPages,
    };
  };

  findOne = async (
    userId: number,
    timelineId: number,
  ): Promise<TimelineResponseDto> => {
    const timeline = await this.getTimelineOrThrow(userId, timelineId);

    return this.toResponseDto(timeline);
  };

  update = async (
    userId: number,
    timelineId: number,
    request: UpdateTimelineRequestDto,
  ): Promise<TimelineResponseDto> => {
    this.validateUpdateRequest(request);
    await this.getTimelineOrThrow(userId, timelineId);
    await this.validateTree(userId, request.treeId);

    const data: UpdateTimelineData = {
      ...request,
      treeId:
        request.treeId === undefined
          ? undefined
          : request.treeId === null
            ? null
            : BigInt(request.treeId),
      visitedAt:
        request.visitedAt === undefined
          ? undefined
          : new Date(request.visitedAt),
    };
    const timeline = await this.timelinesRepository.update(
      BigInt(timelineId),
      data,
    );

    if (!timeline) {
      throw new AppException(ErrorCode.TIMELINE_TREE_ALREADY_LINKED);
    }

    return this.toResponseDto(timeline);
  };

  remove = async (userId: number, timelineId: number): Promise<null> => {
    const timeline = await this.getTimelineOrThrow(userId, timelineId);
    if (timeline.treeId !== null) {
      await this.treesService.deleteTree(userId, Number(timeline.treeId));
    } else {
      await this.timelinesRepository.softDelete(BigInt(timelineId), new Date());
    }

    return null;
  };

  private getTimelineOrThrow = async (
    userId: number,
    timelineId: number,
  ): Promise<TimelineRecordWithTree> => {
    const timeline = await this.timelinesRepository.findByIdAndUser(
      BigInt(timelineId),
      BigInt(userId),
    );

    if (!timeline) {
      throw new AppException(ErrorCode.TIMELINE_NOT_FOUND);
    }

    return timeline;
  };

  private validateTree = async (
    userId: number,
    treeId?: number | null,
  ): Promise<void> => {
    if (treeId == null) {
      return;
    }

    const tree = await this.timelinesRepository.findAvailableTreeByIdAndUser(
      BigInt(treeId),
      BigInt(userId),
    );
    if (!tree) {
      throw new AppException(ErrorCode.TREE_NOT_FOUND);
    }
  };

  private validateUpdateRequest = (request: UpdateTimelineRequestDto): void => {
    const hasUpdateValue = Object.values(request).some(
      (value) => value !== undefined,
    );

    if (!hasUpdateValue) {
      throw new AppException(ErrorCode.TIMELINE_INVALID_UPDATE_REQUEST);
    }
  };

  private toResponseDto = async (
    timeline: TimelineRecordWithTree,
  ): Promise<TimelineResponseDto> => ({
    id: Number(timeline.id),
    userId: Number(timeline.userId),
    treeId: timeline.treeId === null ? null : Number(timeline.treeId),
    title: timeline.title,
    content: timeline.content,
    category: timeline.category,
    visitedAt: timeline.visitedAt,
    createdAt: timeline.createdAt,
    updatedAt: timeline.updatedAt,
    tree:
      timeline.tree === null
        ? null
        : {
            id: Number(timeline.tree.id),
            name: timeline.tree.name,
            mood: timeline.tree.mood,
            defaultImage: timeline.tree.defaultImage,
            isFavorite: timeline.tree.isFavorite,
            imageUrls: await Promise.all(
              timeline.tree.images.map((image) =>
                this.s3Service.getPresignedUrl(image.s3Key),
              ),
            ),
          },
  });
}
