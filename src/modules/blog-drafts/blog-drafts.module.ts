import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BlogDraftContentService } from './services/blog-draft-content.service';
import { BlogDraftResponseBuilderService } from './services/blog-draft-response-builder.service';
import { BlogDraftUsageService } from './services/blog-draft-usage.service';
import { BlogDraftsController } from './blog-drafts.controller';
import { BlogDraftsRepository } from './blog-drafts.repository';
import { BlogDraftsService } from './blog-drafts.service';
import { OpenAiBlogDraftService } from './openai-blog-draft.service';

@Module({
  imports: [AuthModule],
  controllers: [BlogDraftsController],
  providers: [
    BlogDraftsService,
    BlogDraftsRepository,
    OpenAiBlogDraftService,
    BlogDraftUsageService,
    BlogDraftContentService,
    BlogDraftResponseBuilderService,
  ],
})
export class BlogDraftsModule {}
