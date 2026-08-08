import { Injectable } from '@nestjs/common';
import { S3Service } from '../../../common/s3/s3.service';
import {
  formatKstDate,
  formatKstDateTime,
} from '../../../common/utils/kst-date.util';
import {
  BlogDraftDayResponseDto,
  BlogDraftDetailItemResponseDto,
  BlogDraftDetailResponseDto,
  BlogDraftListResponseDto,
  BlogDraftSummaryResponseDto,
} from '../dto/blog-draft-response.dto';
import { BlogDraftContentService } from './blog-draft-content.service';
import { BlogDraftsRepository } from '../blog-drafts.repository';
import {
  BlogDraftGenerateSource,
  BlogDraftItem,
  BlogDraftRecord,
  BlogDraftSourceTreeRecord,
  BlogDraftSummaryRecord,
  StoredBlogDraftDay,
} from '../blog-drafts.types';

interface BlogDraftTreeContext {
  date: string;
  imageUrl: string | null;
}

interface BlogDraftSummaryContext {
  draft: BlogDraftSummaryRecord;
  firstTreeId: number | null;
}

@Injectable()
export class BlogDraftResponseBuilderService {
  constructor(
    private readonly blogDraftsRepository: BlogDraftsRepository,
    private readonly s3Service: S3Service,
    private readonly blogDraftContentService: BlogDraftContentService,
  ) {}

  buildDraftListResponse = async (
    userId: number,
    drafts: BlogDraftSummaryRecord[],
  ): Promise<BlogDraftListResponseDto> => {
    const summaries = drafts.map((draft) => ({
      draft,
      firstTreeId: this.blogDraftContentService.getFirstDraftTreeId(
        draft.content,
      ),
    }));
    const thumbnailUrlByTreeId = await this.getThumbnailUrlByTreeId(
      userId,
      summaries,
    );

    return {
      drafts: summaries.map((summary) =>
        this.toBlogDraftSummaryResponseDto(summary, thumbnailUrlByTreeId),
      ),
    };
  };

  buildDraftDetailResponse = async (
    userId: number,
    draft: BlogDraftRecord,
  ): Promise<BlogDraftDetailResponseDto> => {
    const storedDays = this.blogDraftContentService.parseDraftContent(
      draft.content,
    );
    const items =
      this.blogDraftContentService.flattenStoredDraftDays(storedDays);
    const contextByTreeId = await this.getTreeContextByItems(userId, items);
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

  buildGeneratedDraftDays = async (
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

  private toDraftDayResponseDtos = (
    days: StoredBlogDraftDay[],
    fallbackDate: string,
    contextByTreeId: Map<number, BlogDraftTreeContext>,
  ): BlogDraftDayResponseDto[] => {
    const responseDays = days
      .map((day) => ({
        date: day.date,
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

  private getTreeContextByItems = async (
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

    return this.getTreeContextByTreeIds(userId, treeIds);
  };

  private getTreeContextByTreeIds = async (
    userId: number,
    treeIds: number[],
  ): Promise<Map<number, BlogDraftTreeContext>> => {
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

    return Array.from(groups.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  };

  private getThumbnailUrlByTreeId = async (
    userId: number,
    summaries: BlogDraftSummaryContext[],
  ): Promise<Map<number, BlogDraftTreeContext>> => {
    const treeIds = Array.from(
      new Set(
        summaries
          .map((summary) => summary.firstTreeId)
          .filter((treeId): treeId is number => treeId !== null),
      ),
    );

    return this.getTreeContextByTreeIds(userId, treeIds);
  };

  private toBlogDraftSummaryResponseDto = (
    summary: BlogDraftSummaryContext,
    thumbnailUrlByTreeId: Map<number, BlogDraftTreeContext>,
  ): BlogDraftSummaryResponseDto => {
    const { draft } = summary;

    return {
      draftId: Number(draft.id),
      title: draft.title,
      thumbnailUrl: this.getSummaryThumbnailUrl(summary, thumbnailUrlByTreeId),
      startDate: formatKstDate(draft.startDate),
      endDate: formatKstDate(draft.endDate),
      createdAt: formatKstDateTime(draft.createdAt),
    };
  };

  private getSummaryThumbnailUrl = (
    summary: BlogDraftSummaryContext,
    thumbnailUrlByTreeId: Map<number, BlogDraftTreeContext>,
  ): string | null => {
    if (summary.firstTreeId === null) {
      return null;
    }

    return thumbnailUrlByTreeId.get(summary.firstTreeId)?.imageUrl ?? null;
  };
}
