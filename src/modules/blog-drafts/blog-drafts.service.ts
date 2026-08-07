import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code';
import { BLOG_DRAFT_MAX_TREE_COUNT } from './blog-drafts.constant';
import {
  BlogDraftDetailResponseDto,
  BlogDraftListResponseDto,
  GeneratedBlogDraftResponseDto,
  SavedBlogDraftResponseDto,
} from './dto/blog-draft-response.dto';
import { GenerateBlogDraftRequestDto } from './dto/generate-blog-draft-request.dto';
import { SaveBlogDraftRequestDto } from './dto/save-blog-draft-request.dto';
import { BlogDraftContentService } from './services/blog-draft-content.service';
import { BlogDraftResponseBuilderService } from './services/blog-draft-response-builder.service';
import { BlogDraftUsageService } from './services/blog-draft-usage.service';
import { BlogDraftsRepository } from './blog-drafts.repository';
import { BlogDraftRecord, BlogDraftUserRecord } from './blog-drafts.types';
import { OpenAiBlogDraftService } from './openai-blog-draft.service';

@Injectable()
export class BlogDraftsService {
  constructor(
    private readonly blogDraftsRepository: BlogDraftsRepository,
    private readonly openAiBlogDraftService: OpenAiBlogDraftService,
    private readonly blogDraftUsageService: BlogDraftUsageService,
    private readonly blogDraftContentService: BlogDraftContentService,
    private readonly blogDraftResponseBuilderService: BlogDraftResponseBuilderService,
  ) {}

  generateDraft = async (
    userId: number,
    request: GenerateBlogDraftRequestDto,
  ): Promise<GeneratedBlogDraftResponseDto> => {
    this.validateGenerateRequest(request);
    const [startDate, storedEndDate] =
      this.blogDraftContentService.parseStoredDateRange(
        request.startDate,
        request.endDate,
      );
    const user = await this.getAvailableUserOrThrow(userId);

    await this.blogDraftUsageService.validateMonthlyLimit(userId, user);

    const source = await this.blogDraftsRepository.findGenerateSource(
      userId,
      startDate,
      this.blogDraftContentService.toExclusiveEndDate(storedEndDate),
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
    await this.blogDraftUsageService.consumeUsageWithinLimit(
      userId,
      user,
      new Date(),
    );

    return {
      title: generated.title,
      days: await this.blogDraftResponseBuilderService.buildGeneratedDraftDays(
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
    const [startDate, endDate] =
      this.blogDraftContentService.parseStoredDateRange(
        request.startDate,
        request.endDate,
      );
    const storedDays = this.blogDraftContentService.buildStoredDraftDays(
      request.days,
    );
    const items =
      this.blogDraftContentService.flattenStoredDraftDays(storedDays);
    this.blogDraftContentService.validateStoredDayDates(
      storedDays,
      startDate,
      endDate,
    );
    this.blogDraftContentService.validateDraftContent(request.title, items);
    this.blogDraftContentService.validateSaveDraftItems(items);
    const treeIds = this.blogDraftContentService.extractSaveDraftTreeIds(items);

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

    return this.blogDraftResponseBuilderService.buildDraftListResponse(
      userId,
      drafts,
    );
  };

  getDraft = async (
    userId: number,
    draftId: number,
  ): Promise<BlogDraftDetailResponseDto> => {
    const draft = await this.getDraftOrThrow(userId, draftId);

    return this.blogDraftResponseBuilderService.buildDraftDetailResponse(
      userId,
      draft,
    );
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

  private validateGenerateRequest = (
    request: GenerateBlogDraftRequestDto,
  ): void => {
    if (request.treeIds.length > BLOG_DRAFT_MAX_TREE_COUNT) {
      throw new AppException(ErrorCode.BLOG_DRAFT_INVALID_REQUEST);
    }
  };
}
