import { Injectable } from '@nestjs/common';
import { AppException } from '../../../common/exceptions/app.exception';
import { ErrorCode } from '../../../common/exceptions/error-code';
import { parseKstDateStart } from '../../../common/utils/kst-date.util';
import { BLOG_DRAFT_MAX_TREE_COUNT } from '../blog-drafts.constant';
import { SaveBlogDraftRequestDto } from '../dto/save-blog-draft-request.dto';
import { BlogDraftItem, StoredBlogDraftDay } from '../blog-drafts.types';

@Injectable()
export class BlogDraftContentService {
  parseStoredDateRange = (startDate: string, endDate: string): [Date, Date] => {
    const start = parseKstDateStart(startDate);
    const end = parseKstDateStart(endDate);

    if (start === null || end === null || start > end) {
      throw new AppException(ErrorCode.BLOG_DRAFT_INVALID_REQUEST);
    }

    return [start, end];
  };

  validateDraftContent = (title: string, items: BlogDraftItem[]): void => {
    if (
      !title.trim() ||
      items.length === 0 ||
      items.some((item) => !item.placeName.trim() || !item.content.trim())
    ) {
      throw new AppException(ErrorCode.BLOG_DRAFT_EMPTY_CONTENT);
    }
  };

  validateSaveDraftItems = (items: BlogDraftItem[]): void => {
    if (
      items.length > BLOG_DRAFT_MAX_TREE_COUNT ||
      items.some((item) => typeof item.treeId !== 'number')
    ) {
      throw new AppException(ErrorCode.BLOG_DRAFT_INVALID_REQUEST);
    }
  };

  validateStoredDayDates = (
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

  buildStoredDraftDays = (
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

  flattenStoredDraftDays = (days: StoredBlogDraftDay[]): BlogDraftItem[] =>
    days.flatMap((day) => day.items);

  extractSaveDraftTreeIds = (items: BlogDraftItem[]): number[] =>
    Array.from(new Set(items.map((item) => item.treeId as number)));

  toExclusiveEndDate = (endDate: Date): Date => {
    return new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
  };

  parseDraftContent = (content: string): StoredBlogDraftDay[] => {
    try {
      const parsed = JSON.parse(content) as unknown;

      if (!Array.isArray(parsed)) {
        return [this.createFallbackStoredDraftDay(content)];
      }

      if (parsed.length === 0) {
        return [];
      }

      const days = this.parseStoredDraftDays(parsed);

      return days.length > 0
        ? days
        : [this.createFallbackStoredDraftDay(content)];
    } catch {
      return [this.createFallbackStoredDraftDay(content)];
    }
  };

  getFirstDraftTreeId = (content: string): number | null => {
    return (
      this.flattenStoredDraftDays(this.parseDraftContent(content))[0]?.treeId ??
      null
    );
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
}
