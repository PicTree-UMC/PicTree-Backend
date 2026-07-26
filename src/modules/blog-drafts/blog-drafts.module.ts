import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BlogDraftsController } from './blog-drafts.controller';
import { BlogDraftsRepository } from './blog-drafts.repository';
import { BlogDraftsService } from './blog-drafts.service';
import { OpenAiBlogDraftService } from './openai-blog-draft.service';

@Module({
  imports: [AuthModule],
  controllers: [BlogDraftsController],
  providers: [BlogDraftsService, BlogDraftsRepository, OpenAiBlogDraftService],
})
export class BlogDraftsModule {}
