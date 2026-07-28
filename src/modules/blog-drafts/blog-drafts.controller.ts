import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../../common/responses/api.response';
import { SuccessCode } from '../../common/responses/success-code';
import { AccessTokenGuard } from '../auth/access-token.guard';
import type { JwtPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  BlogDraftDetailResponseDto,
  BlogDraftListResponseDto,
  GeneratedBlogDraftResponseDto,
  SavedBlogDraftResponseDto,
} from './dto/blog-draft-response.dto';
import { GenerateBlogDraftRequestDto } from './dto/generate-blog-draft-request.dto';
import { SaveBlogDraftRequestDto } from './dto/save-blog-draft-request.dto';
import { BlogDraftsService } from './blog-drafts.service';
import {
  ApiDeleteBlogDraft,
  ApiGenerateBlogDraft,
  ApiGetBlogDraft,
  ApiGetBlogDrafts,
  ApiSaveBlogDraft,
} from './blog-drafts.swagger';

@ApiTags('BlogDrafts')
@Controller('blog-drafts')
@UseGuards(AccessTokenGuard)
export class BlogDraftsController {
  constructor(private readonly blogDraftsService: BlogDraftsService) {}

  @Get()
  @ApiGetBlogDrafts()
  async getDrafts(
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<ApiResponse<BlogDraftListResponseDto>> {
    const data = await this.blogDraftsService.getDrafts(currentUser.userId);

    return ApiResponse.success(SuccessCode.BLOG_DRAFT_RETRIEVED, data);
  }

  @Post('generate')
  @ApiGenerateBlogDraft()
  async generateDraft(
    @CurrentUser() currentUser: JwtPayload,
    @Body() request: GenerateBlogDraftRequestDto,
  ): Promise<ApiResponse<GeneratedBlogDraftResponseDto>> {
    const data = await this.blogDraftsService.generateDraft(
      currentUser.userId,
      request,
    );

    return ApiResponse.success(SuccessCode.BLOG_DRAFT_GENERATED, data);
  }

  @Post()
  @ApiSaveBlogDraft()
  async saveDraft(
    @CurrentUser() currentUser: JwtPayload,
    @Body() request: SaveBlogDraftRequestDto,
  ): Promise<ApiResponse<SavedBlogDraftResponseDto>> {
    const data = await this.blogDraftsService.saveDraft(
      currentUser.userId,
      request,
    );

    return ApiResponse.success(SuccessCode.BLOG_DRAFT_SAVED, data);
  }

  @Get(':draftId')
  @ApiGetBlogDraft()
  async getDraft(
    @CurrentUser() currentUser: JwtPayload,
    @Param('draftId', ParseIntPipe) draftId: number,
  ): Promise<ApiResponse<BlogDraftDetailResponseDto>> {
    const data = await this.blogDraftsService.getDraft(
      currentUser.userId,
      draftId,
    );

    return ApiResponse.success(SuccessCode.BLOG_DRAFT_DETAIL_RETRIEVED, data);
  }

  @Delete(':draftId')
  @ApiDeleteBlogDraft()
  async deleteDraft(
    @CurrentUser() currentUser: JwtPayload,
    @Param('draftId', ParseIntPipe) draftId: number,
  ): Promise<ApiResponse<null>> {
    await this.blogDraftsService.deleteDraft(currentUser.userId, draftId);

    return ApiResponse.success(SuccessCode.BLOG_DRAFT_DELETED, null);
  }
}
