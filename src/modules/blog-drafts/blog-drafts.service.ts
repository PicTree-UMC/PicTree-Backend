import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code';
import { S3Service } from '../../common/s3/s3.service';
import {
  BLOG_DRAFT_LIMIT,
  BLOG_DRAFT_MAX_TREE_COUNT,
} from './blog-drafts.constant';
import {
  BlogDraftDetailItemResponseDto,
  BlogDraftDetailResponseDto,
  BlogDraftListResponseDto,
  BlogDraftSummaryResponseDto,
  GeneratedBlogDraftResponseDto,
  SavedBlogDraftResponseDto,
} from './dto/blog-draft-response.dto';
import { GenerateBlogDraftRequestDto } from './dto/generate-blog-draft-request.dto';
import { SaveBlogDraftRequestDto } from './dto/save-blog-draft-request.dto';
import { BlogDraftsRepository } from './blog-drafts.repository';
import {
  BlogDraftItem,
  BlogDraftRecord,
  BlogDraftSummaryRecord,
  BlogDraftUserRecord,
} from './blog-drafts.types';
import { OpenAiBlogDraftService } from './openai-blog-draft.service';

@Injectable()
export class BlogDraftsService {
  constructor(
    private readonly blogDraftsRepository: BlogDraftsRepository,
    private readonly openAiBlogDraftService: OpenAiBlogDraftService,
    private readonly s3Service: S3Service,
  ) {}

  generateDraft = async (
    userId: number,
    request: GenerateBlogDraftRequestDto,
  ): Promise<GeneratedBlogDraftResponseDto> => {
    this.validateGenerateRequest(request);
    const [startDate, storedEndDate] = this.parseStoredDateRange(
      request.startDate,
      request.endDate,
    );
    const user = await this.getAvailableUserOrThrow(userId);

    await this.validateMonthlyLimit(userId, user);

    const source = await this.blogDraftsRepository.findGenerateSource(
      userId,
      startDate,
      this.toExclusiveEndDate(storedEndDate),
      request.treeIds,
    );

    if (source.trees.length !== request.treeIds.length) {
      throw new AppException(ErrorCode.TREE_NOT_FOUND);
    }

    if (source.trees.length === 0 && source.timelines.length === 0) {
      throw new AppException(ErrorCode.BLOG_DRAFT_SOURCE_EMPTY);
    }

    const generated = await this.openAiBlogDraftService.generate(
      source,
      request.startDate,
      request.endDate,
      request.tone,
    );
    await this.consumeUsageWithinLimit(userId, user, new Date());

    return {
      title: generated.title,
      items: generated.items,
      startDate: request.startDate,
      endDate: request.endDate,
    };
  };

  saveDraft = async (
    userId: number,
    request: SaveBlogDraftRequestDto,
  ): Promise<SavedBlogDraftResponseDto> => {
    const [startDate, endDate] = this.parseStoredDateRange(
      request.startDate,
      request.endDate,
    );
    this.validateDraftContent(request.title, request.items);
    this.validateDraftItemTreeIds(request.items, request.treeIds);
    await this.getAvailableUserOrThrow(userId);
    await this.validateTreeIds(userId, request.treeIds);
    const saved = await this.blogDraftsRepository.createDraft({
      userId: BigInt(userId),
      title: request.title,
      content: JSON.stringify(
        this.buildSavedDraftItems(request.items, request.treeIds),
      ),
      startDate,
      endDate,
    });

    return {
      draftId: Number(saved.id),
    };
  };

  getDrafts = async (userId: number): Promise<BlogDraftListResponseDto> => {
    const drafts =
      await this.blogDraftsRepository.findSavedDraftsByUserId(userId);

    return {
      drafts: drafts.map(this.toBlogDraftSummaryResponseDto),
    };
  };

  getDraft = async (
    userId: number,
    draftId: number,
  ): Promise<BlogDraftDetailResponseDto> => {
    const draft = await this.getDraftOrThrow(userId, draftId);

    return this.toBlogDraftDetailResponseDto(userId, draft);
  };

  deleteDraft = async (userId: number, draftId: number): Promise<null> => {
    const deleted = await this.blogDraftsRepository.deleteDraft(
      draftId,
      userId,
    );

    if (deleted.count === 0) {
      throw new AppException(ErrorCode.BLOG_DRAFT_NOT_FOUND);
    }

    return null;
  };

  private getAvailableUserOrThrow = async (
    userId: number,
  ): Promise<BlogDraftUserRecord> => {
    const user = await this.blogDraftsRepository.findUserById(userId);

    if (!user) {
      throw new AppException(ErrorCode.USER_NOT_FOUND);
    }

    if (user.status !== 'ACTIVE') {
      throw new AppException(ErrorCode.USER_UNAVAILABLE);
    }

    return user;
  };

  private validateMonthlyLimit = async (
    userId: number,
    user: BlogDraftUserRecord,
  ): Promise<void> => {
    const now = new Date();
    const [usageStart, usageEnd] = this.resolveUsageWindow(user, now);
    const used = await this.blogDraftsRepository.countGeneratedDraftsInRange(
      userId,
      usageStart,
      usageEnd,
    );
    const limit = this.resolveMonthlyLimit(user, now);

    if (used >= limit) {
      throw new AppException(ErrorCode.BLOG_DRAFT_LIMIT_EXCEEDED);
    }
  };

  private consumeUsageWithinLimit = async (
    userId: number,
    user: BlogDraftUserRecord,
    now: Date,
  ): Promise<void> => {
    const [usageStart, usageEnd] = this.resolveUsageWindow(user, now);
    const limit = this.resolveMonthlyLimit(user, now);

    try {
      await this.blogDraftsRepository.consumeUsageWithinLimit(
        BigInt(userId),
        usageStart,
        usageEnd,
        limit,
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'BLOG_DRAFT_LIMIT_EXCEEDED'
      ) {
        throw new AppException(ErrorCode.BLOG_DRAFT_LIMIT_EXCEEDED);
      }

      throw error;
    }
  };

  private resolveMonthlyLimit = (
    user: BlogDraftUserRecord,
    now: Date,
  ): number => {
    const planCode = user.currentSubscription?.subscriptionPlan.code;

    if (user.currentSubscription && user.currentSubscription.expiresAt > now) {
      switch (planCode) {
        case 'PLUS':
          return BLOG_DRAFT_LIMIT.PLUS;
        case 'PRO':
          return BLOG_DRAFT_LIMIT.PRO;
        case 'MAX':
          return BLOG_DRAFT_LIMIT.MAX;
        case 'FREE':
        default:
          return BLOG_DRAFT_LIMIT.FREE;
      }
    }

    return BLOG_DRAFT_LIMIT.FREE;
  };

  private resolveUsageWindow = (
    user: BlogDraftUserRecord,
    now: Date,
  ): [Date, Date] => {
    if (user.currentSubscription && user.currentSubscription.expiresAt > now) {
      return this.resolvePaidUsageWindow(
        user.currentSubscription.startedAt,
        now,
      );
    }

    return [
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
    ];
  };

  private resolvePaidUsageWindow = (
    startedAt: Date,
    now: Date,
  ): [Date, Date] => {
    const startedDay = startedAt.getUTCDate();
    const currentMonthAnchor = this.createMonthlyAnchor(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      startedDay,
    );

    if (now >= currentMonthAnchor) {
      return [
        currentMonthAnchor,
        this.createMonthlyAnchor(
          now.getUTCFullYear(),
          now.getUTCMonth() + 1,
          startedDay,
        ),
      ];
    }

    return [
      this.createMonthlyAnchor(
        now.getUTCFullYear(),
        now.getUTCMonth() - 1,
        startedDay,
      ),
      currentMonthAnchor,
    ];
  };

  private createMonthlyAnchor = (
    year: number,
    month: number,
    day: number,
  ): Date => {
    const monthStart = new Date(Date.UTC(year, month, 1));
    const lastDay = new Date(
      Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0),
    ).getUTCDate();

    return new Date(
      Date.UTC(
        monthStart.getUTCFullYear(),
        monthStart.getUTCMonth(),
        Math.min(day, lastDay),
      ),
    );
  };

  private getDraftOrThrow = async (
    userId: number,
    draftId: number,
  ): Promise<BlogDraftRecord> => {
    const draft = await this.blogDraftsRepository.findDraftByIdAndUserId(
      draftId,
      userId,
    );

    if (!draft) {
      throw new AppException(ErrorCode.BLOG_DRAFT_NOT_FOUND);
    }

    return draft;
  };

  private validateTreeIds = async (
    userId: number,
    treeIds: number[],
  ): Promise<void> => {
    const source = await this.blogDraftsRepository.findGenerateSource(
      userId,
      new Date('1970-01-01T00:00:00.000Z'),
      new Date('9999-12-31T00:00:00.000Z'),
      treeIds,
    );

    if (source.trees.length !== treeIds.length) {
      throw new AppException(ErrorCode.TREE_NOT_FOUND);
    }
  };

  private parseStoredDateRange = (
    startDate: string,
    endDate: string,
  ): [Date, Date] => {
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T00:00:00.000Z`);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      start > end
    ) {
      throw new AppException(ErrorCode.BLOG_DRAFT_INVALID_REQUEST);
    }

    return [start, end];
  };

  private validateGenerateRequest = (
    request: GenerateBlogDraftRequestDto,
  ): void => {
    if (request.treeIds.length > BLOG_DRAFT_MAX_TREE_COUNT) {
      throw new AppException(ErrorCode.BLOG_DRAFT_INVALID_REQUEST);
    }
  };

  private validateDraftContent = (
    title: string,
    items: BlogDraftItem[],
  ): void => {
    if (
      !title.trim() ||
      items.length === 0 ||
      items.some((item) => !item.placeName.trim() || !item.content.trim())
    ) {
      throw new AppException(ErrorCode.BLOG_DRAFT_EMPTY_CONTENT);
    }
  };

  private validateDraftItemTreeIds = (
    items: BlogDraftItem[],
    treeIds: number[],
  ): void => {
    if (items.length !== treeIds.length) {
      throw new AppException(ErrorCode.BLOG_DRAFT_INVALID_REQUEST);
    }
  };

  private buildSavedDraftItems = (
    items: BlogDraftItem[],
    treeIds: number[],
  ): BlogDraftItem[] =>
    items.map((item, index) => ({
      treeId: treeIds[index],
      placeName: item.placeName,
      content: item.content,
    }));

  private toExclusiveEndDate = (endDate: Date): Date => {
    return new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
  };

  private toBlogDraftDetailResponseDto = async (
    userId: number,
    draft: BlogDraftRecord,
  ): Promise<BlogDraftDetailResponseDto> => {
    const items = this.parseDraftItems(draft.content);
    const imageUrlByTreeId = await this.getImageUrlByTreeId(userId, items);

    return {
      draftId: Number(draft.id),
      title: draft.title,
      items: items.map((item) => ({
        ...item,
        imageUrl:
          item.treeId === null
            ? null
            : (imageUrlByTreeId.get(item.treeId) ?? null),
      })),
      startDate: draft.startDate.toISOString().slice(0, 10),
      endDate: draft.endDate.toISOString().slice(0, 10),
      createdAt: draft.createdAt.toISOString().slice(0, 19),
    };
  };

  private parseDraftItems = (
    content: string,
  ): BlogDraftDetailItemResponseDto[] => {
    try {
      const parsed = JSON.parse(content) as unknown;

      if (!Array.isArray(parsed)) {
        return [
          { treeId: null, imageUrl: null, placeName: '여행 기록', content },
        ];
      }

      const items = parsed
        .map((item) => {
          if (!this.isDraftItemLike(item)) {
            return null;
          }

          const placeName = item.placeName.trim();
          const itemContent = item.content.trim();

          if (!placeName || !itemContent) {
            return null;
          }

          const draftItem: BlogDraftDetailItemResponseDto = {
            treeId: this.getDraftItemTreeId(item),
            imageUrl: null,
            placeName,
            content: itemContent,
          };

          return draftItem;
        })
        .filter(
          (item): item is BlogDraftDetailItemResponseDto => item !== null,
        );

      return items.length > 0
        ? items
        : [
            { treeId: null, imageUrl: null, placeName: '여행 기록', content },
          ];
    } catch {
      return [
        { treeId: null, imageUrl: null, placeName: '여행 기록', content },
      ];
    }
  };

  private isDraftItemLike = (
    item: unknown,
  ): item is { treeId?: unknown; placeName: string; content: string } => {
    if (typeof item !== 'object' || item === null) {
      return false;
    }

    const draftItem = item as Record<string, unknown>;

    return (
      typeof draftItem.placeName === 'string' &&
      typeof draftItem.content === 'string'
    );
  };

  private getDraftItemTreeId = (item: { treeId?: unknown }): number | null => {
    if (typeof item.treeId !== 'number') {
      return null;
    }

    return item.treeId;
  };

  private getImageUrlByTreeId = async (
    userId: number,
    items: BlogDraftDetailItemResponseDto[],
  ): Promise<Map<number, string>> => {
    const treeIds = Array.from(
      new Set(
        items
          .map((item) => item.treeId)
          .filter((treeId): treeId is number => treeId !== null),
      ),
    );

    if (treeIds.length === 0) {
      return new Map();
    }

    const trees = await this.blogDraftsRepository.findTreeImagesByIds(
      userId,
      treeIds,
    );
    const entries = await Promise.all(
      trees.map(async (tree) => {
        const image = tree.images[0];

        if (!image) {
          return null;
        }

        return [
          Number(tree.id),
          await this.s3Service.getPresignedUrl(image.s3Key),
        ] as const;
      }),
    );

    return new Map(
      entries.filter(
        (entry): entry is readonly [number, string] => entry !== null,
      ),
    );
  };

  private toBlogDraftSummaryResponseDto = (
    draft: BlogDraftSummaryRecord,
  ): BlogDraftSummaryResponseDto => ({
    draftId: Number(draft.id),
    title: draft.title,
    startDate: draft.startDate.toISOString().slice(0, 10),
    endDate: draft.endDate.toISOString().slice(0, 10),
    createdAt: draft.createdAt.toISOString().slice(0, 19),
  });
}
