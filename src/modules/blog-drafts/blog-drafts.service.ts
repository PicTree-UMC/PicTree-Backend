import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code';
import { S3Service } from '../../common/s3/s3.service';
import {
  createKstMonthlyAnchor,
  formatKstDate,
  formatKstDateTime,
  parseKstDateStart,
  toKstDateParts,
} from '../../common/utils/kst-date.util';
import {
  BLOG_DRAFT_LIMIT,
  BLOG_DRAFT_MAX_TREE_COUNT,
} from './blog-drafts.constant';
import {
  BlogDraftDayResponseDto,
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
  BlogDraftGenerateSource,
  BlogDraftItem,
  BlogDraftRecord,
  BlogDraftSourceTreeRecord,
  BlogDraftSummaryRecord,
  BlogDraftUserRecord,
  StoredBlogDraftDay,
} from './blog-drafts.types';
import { OpenAiBlogDraftService } from './openai-blog-draft.service';

interface BlogDraftTreeContext {
  date: string;
  imageUrl: string | null;
}

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
      days: await this.buildGeneratedDraftDays(
        source,
        generated.items,
        request.startDate,
      ),
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
    const storedDays = this.buildStoredDraftDays(request.days);
    const items = this.flattenStoredDraftDays(storedDays);
    this.validateStoredDayDates(storedDays, startDate, endDate);
    this.validateDraftContent(request.title, items);
    this.validateSaveDraftItems(items);
    const treeIds = this.extractSaveDraftTreeIds(items);

    await this.getAvailableUserOrThrow(userId);
    await this.validateTreeIds(userId, treeIds);
    const saved = await this.blogDraftsRepository.createDraft({
      userId: BigInt(userId),
      title: request.title,
      content: JSON.stringify(storedDays),
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
    const thumbnailUrlByTreeId = await this.getThumbnailUrlByTreeId(
      userId,
      drafts,
    );

    return {
      drafts: drafts.map((draft) =>
        this.toBlogDraftSummaryResponseDto(draft, thumbnailUrlByTreeId),
      ),
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

    return this.resolveFreeUsageWindow(now);
  };

  private resolveFreeUsageWindow = (now: Date): [Date, Date] => {
    const { year, monthIndex } = toKstDateParts(now);

    return [
      createKstMonthlyAnchor(year, monthIndex, 1),
      createKstMonthlyAnchor(year, monthIndex + 1, 1),
    ];
  };

  private resolvePaidUsageWindow = (
    startedAt: Date,
    now: Date,
  ): [Date, Date] => {
    const { day: startedDay } = toKstDateParts(startedAt);
    const { year, monthIndex } = toKstDateParts(now);
    const currentMonthAnchor = createKstMonthlyAnchor(
      year,
      monthIndex,
      startedDay,
    );

    if (now >= currentMonthAnchor) {
      return [
        currentMonthAnchor,
        createKstMonthlyAnchor(year, monthIndex + 1, startedDay),
      ];
    }

    return [
      createKstMonthlyAnchor(year, monthIndex - 1, startedDay),
      currentMonthAnchor,
    ];
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
    const start = parseKstDateStart(startDate);
    const end = parseKstDateStart(endDate);

    if (start === null || end === null || start > end) {
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

  private validateSaveDraftItems = (items: BlogDraftItem[]): void => {
    if (
      items.length > BLOG_DRAFT_MAX_TREE_COUNT ||
      items.some((item) => typeof item.treeId !== 'number')
    ) {
      throw new AppException(ErrorCode.BLOG_DRAFT_INVALID_REQUEST);
    }
  };

  private validateStoredDayDates = (
    days: StoredBlogDraftDay[],
    startDate: Date,
    endDate: Date,
  ): void => {
    const hasInvalidDate = days.some((day) => {
      const date = parseKstDateStart(day.date);

      return date === null || date < startDate || date > endDate;
    });

    if (hasInvalidDate) {
      throw new AppException(ErrorCode.BLOG_DRAFT_INVALID_REQUEST);
    }
  };

  private buildStoredDraftDays = (
    days: SaveBlogDraftRequestDto['days'],
  ): StoredBlogDraftDay[] =>
    days.map((day) => ({
      date: day.date,
      items: day.items.map((item) => ({
        treeId: item.treeId,
        placeName: item.placeName,
        content: item.content,
      })),
    }));

  private flattenStoredDraftDays = (
    days: StoredBlogDraftDay[],
  ): BlogDraftItem[] => days.flatMap((day) => day.items);

  private extractSaveDraftTreeIds = (items: BlogDraftItem[]): number[] =>
    Array.from(new Set(items.map((item) => item.treeId as number)));

  private toExclusiveEndDate = (endDate: Date): Date => {
    return new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
  };

  private toBlogDraftDetailResponseDto = async (
    userId: number,
    draft: BlogDraftRecord,
  ): Promise<BlogDraftDetailResponseDto> => {
    const storedDays = this.parseDraftContent(draft.content);
    const items = this.flattenStoredDraftDays(storedDays);
    const contextByTreeId = await this.getTreeContextByTreeId(userId, items);
    const fallbackDate = formatKstDate(draft.startDate);

    return {
      draftId: Number(draft.id),
      title: draft.title,
      days: this.toDraftDayResponseDtos(
        storedDays,
        fallbackDate,
        contextByTreeId,
      ),
      startDate: formatKstDate(draft.startDate),
      endDate: formatKstDate(draft.endDate),
      createdAt: formatKstDateTime(draft.createdAt),
    };
  };

  private parseDraftContent = (content: string): StoredBlogDraftDay[] => {
    try {
      const parsed = JSON.parse(content) as unknown;

      if (!Array.isArray(parsed)) {
        return [this.createFallbackStoredDraftDay(content)];
      }

      const days = this.parseStoredDraftDays(parsed);

      return days.length > 0
        ? days
        : [this.createFallbackStoredDraftDay(content)];
    } catch {
      return [this.createFallbackStoredDraftDay(content)];
    }
  };

  private parseStoredDraftDays = (parsed: unknown[]): StoredBlogDraftDay[] => {
    if (parsed.every((item) => this.isStoredDraftDayLike(item))) {
      return parsed
        .map((day) => {
          const items = day.items
            .map((item) => this.parseStoredDraftItem(item))
            .filter((item): item is BlogDraftItem => item !== null);

          return items.length > 0 ? { date: day.date, items } : null;
        })
        .filter((day): day is StoredBlogDraftDay => day !== null);
    }

    const legacyItems = parsed
      .map((item) => this.parseStoredDraftItem(item))
      .filter((item): item is BlogDraftItem => item !== null);

    return legacyItems.length > 0 ? [{ date: '', items: legacyItems }] : [];
  };

  private parseStoredDraftItem = (item: unknown): BlogDraftItem | null => {
    if (!this.isDraftItemLike(item)) {
      return null;
    }

    const placeName = item.placeName.trim();
    const itemContent = item.content.trim();

    if (!placeName || !itemContent) {
      return null;
    }

    return {
      treeId: this.getDraftItemTreeId(item),
      placeName,
      content: itemContent,
    };
  };

  private isStoredDraftDayLike = (
    item: unknown,
  ): item is { date: string; items: unknown[] } => {
    if (typeof item !== 'object' || item === null) {
      return false;
    }

    const draftDay = item as Record<string, unknown>;

    return typeof draftDay.date === 'string' && Array.isArray(draftDay.items);
  };

  private createFallbackStoredDraftDay = (
    content: string,
  ): StoredBlogDraftDay => ({
    date: '',
    items: [{ treeId: null, placeName: '여행 기록', content }],
  });

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

  private toDraftDayResponseDtos = (
    days: StoredBlogDraftDay[],
    fallbackDate: string,
    contextByTreeId: Map<number, BlogDraftTreeContext>,
  ): BlogDraftDayResponseDto[] => {
    if (days.some((day) => !day.date)) {
      return this.groupDraftItemsByDate(
        this.flattenStoredDraftDays(days).map((item) =>
          this.toBlogDraftDetailItemResponseDto(item, contextByTreeId),
        ),
        contextByTreeId,
        fallbackDate,
      );
    }

    const responseDays = days
      .map((day) => ({
        date: day.date || fallbackDate,
        items: day.items.map((item) =>
          this.toBlogDraftDetailItemResponseDto(item, contextByTreeId),
        ),
      }))
      .filter((day) => day.items.length > 0);

    return responseDays.length > 0
      ? responseDays
      : [{ date: fallbackDate, items: [] }];
  };

  private toBlogDraftDetailItemResponseDto = (
    item: BlogDraftItem,
    contextByTreeId: Map<number, BlogDraftTreeContext>,
  ): BlogDraftDetailItemResponseDto => {
    const treeId = item.treeId ?? null;

    return {
      treeId,
      imageUrl:
        treeId === null
          ? null
          : (contextByTreeId.get(treeId)?.imageUrl ?? null),
      placeName: item.placeName,
      content: item.content,
    };
  };

  private buildGeneratedDraftDays = async (
    source: BlogDraftGenerateSource,
    items: BlogDraftItem[],
    fallbackDate: string,
  ): Promise<BlogDraftDayResponseDto[]> => {
    const contextByTreeId = new Map<number, BlogDraftTreeContext>();
    const usedTreeIds = new Set<number>();
    const detailItems = await Promise.all(
      items.map(async (item, index) => {
        const tree = this.findGeneratedItemTree(
          item,
          index,
          source.trees,
          usedTreeIds,
        );

        if (!tree) {
          return {
            treeId: null,
            imageUrl: null,
            placeName: item.placeName,
            content: item.content,
          };
        }

        const treeId = Number(tree.id);
        usedTreeIds.add(treeId);
        const imageUrl = await this.getSourceTreeImageUrl(tree);
        contextByTreeId.set(treeId, {
          date: formatKstDate(tree.createdAt),
          imageUrl,
        });

        return {
          treeId,
          imageUrl,
          placeName: item.placeName,
          content: item.content,
        };
      }),
    );

    return this.groupDraftItemsByDate(
      detailItems,
      contextByTreeId,
      fallbackDate,
    );
  };

  private findGeneratedItemTree = (
    item: BlogDraftItem,
    index: number,
    trees: BlogDraftSourceTreeRecord[],
    usedTreeIds: Set<number>,
  ): BlogDraftSourceTreeRecord | undefined => {
    const matchedByName = trees.find((tree) => {
      const treeId = Number(tree.id);

      return tree.name === item.placeName && !usedTreeIds.has(treeId);
    });

    if (matchedByName) {
      return matchedByName;
    }

    const fallbackTree = trees[index];

    if (!fallbackTree || usedTreeIds.has(Number(fallbackTree.id))) {
      return undefined;
    }

    return fallbackTree;
  };

  private getSourceTreeImageUrl = async (
    tree: BlogDraftSourceTreeRecord,
  ): Promise<string | null> => {
    const image = tree.images[0];

    if (!image) {
      return null;
    }

    return this.s3Service.getPresignedUrl(image.s3Key);
  };

  private getTreeContextByTreeId = async (
    userId: number,
    items: BlogDraftItem[],
  ): Promise<Map<number, BlogDraftTreeContext>> => {
    const treeIds = Array.from(
      new Set(
        items
          .map((item) => item.treeId)
          .filter((treeId): treeId is number => typeof treeId === 'number'),
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

        return [
          Number(tree.id),
          {
            date: formatKstDate(tree.createdAt),
            imageUrl: image
              ? await this.s3Service.getPresignedUrl(image.s3Key)
              : null,
          },
        ] as const;
      }),
    );

    return new Map(entries);
  };

  private groupDraftItemsByDate = (
    items: BlogDraftDetailItemResponseDto[],
    contextByTreeId: Map<number, BlogDraftTreeContext>,
    fallbackDate: string,
  ): BlogDraftDayResponseDto[] => {
    const groups = new Map<string, BlogDraftDayResponseDto>();

    for (const item of items) {
      const date =
        item.treeId === null
          ? fallbackDate
          : (contextByTreeId.get(item.treeId)?.date ?? fallbackDate);

      const group = groups.get(date) ?? { date, items: [] };
      group.items.push(item);
      groups.set(date, group);
    }

    return Array.from(groups.values());
  };

  private getThumbnailUrlByTreeId = async (
    userId: number,
    drafts: BlogDraftSummaryRecord[],
  ): Promise<Map<number, BlogDraftTreeContext>> => {
    const items = drafts
      .map(
        (draft) =>
          this.flattenStoredDraftDays(this.parseDraftContent(draft.content))[0],
      )
      .filter((item): item is BlogDraftItem => item !== undefined);

    return this.getTreeContextByTreeId(userId, items);
  };

  private getFirstDraftTreeId = (content: string): number | null => {
    return (
      this.flattenStoredDraftDays(this.parseDraftContent(content))[0]?.treeId ??
      null
    );
  };

  private toBlogDraftSummaryResponseDto = (
    draft: BlogDraftSummaryRecord,
    thumbnailUrlByTreeId: Map<number, BlogDraftTreeContext>,
  ): BlogDraftSummaryResponseDto => ({
    draftId: Number(draft.id),
    title: draft.title,
    thumbnailUrl: this.getSummaryThumbnailUrl(draft, thumbnailUrlByTreeId),
    startDate: formatKstDate(draft.startDate),
    endDate: formatKstDate(draft.endDate),
    createdAt: formatKstDateTime(draft.createdAt),
  });

  private getSummaryThumbnailUrl = (
    draft: BlogDraftSummaryRecord,
    thumbnailUrlByTreeId: Map<number, BlogDraftTreeContext>,
  ): string | null => {
    const treeId = this.getFirstDraftTreeId(draft.content);

    if (treeId === null) {
      return null;
    }

    return thumbnailUrlByTreeId.get(treeId)?.imageUrl ?? null;
  };
}
