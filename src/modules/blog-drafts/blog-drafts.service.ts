import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code';
import { BLOG_DRAFT_LIMIT } from './blog-drafts.constant';
import {
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
  ) {}

  generateDraft = async (
    userId: number,
    request: GenerateBlogDraftRequestDto,
  ): Promise<GeneratedBlogDraftResponseDto> => {
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

    if (source.trees.length === 0 && source.timelines.length === 0) {
      throw new AppException(ErrorCode.BLOG_DRAFT_SOURCE_EMPTY);
    }

    const generated = await this.openAiBlogDraftService.generate(
      source,
      request.startDate,
      request.endDate,
    );
    await this.blogDraftsRepository.createUsage(userId);

    return {
      title: generated.title,
      content: generated.content,
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
    await this.getAvailableUserOrThrow(userId);
    await this.validateTreeIds(userId, request.treeIds);
    const saved = await this.blogDraftsRepository.createDraft({
      userId,
      title: request.title,
      content: request.content,
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

    return this.toBlogDraftDetailResponseDto(draft);
  };

  deleteDraft = async (userId: number, draftId: number): Promise<null> => {
    await this.getDraftOrThrow(userId, draftId);
    await this.blogDraftsRepository.deleteDraft(draftId);

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
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const nextMonthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    );
    const used = await this.blogDraftsRepository.countGeneratedDraftsInRange(
      userId,
      monthStart,
      nextMonthStart,
    );
    const limit = this.resolveMonthlyLimit(user, now);

    if (used >= limit) {
      throw new AppException(ErrorCode.BLOG_DRAFT_LIMIT_EXCEEDED);
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
        default:
          break;
      }
    }

    return BLOG_DRAFT_LIMIT.FREE;
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

  private toExclusiveEndDate = (endDate: Date): Date => {
    return new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
  };

  private toBlogDraftDetailResponseDto = (
    draft: BlogDraftRecord,
  ): BlogDraftDetailResponseDto => ({
    draftId: Number(draft.id),
    title: draft.title,
    content: draft.content,
    startDate: draft.startDate.toISOString().slice(0, 10),
    endDate: draft.endDate.toISOString().slice(0, 10),
    createdAt: draft.createdAt.toISOString().slice(0, 19),
  });

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
