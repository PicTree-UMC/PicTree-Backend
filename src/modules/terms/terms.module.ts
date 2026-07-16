import { Module } from '@nestjs/common';
import { TermsController } from './terms.controller';
import { TermsRepository } from './terms.repository';
import { TermsService } from './terms.service';

@Module({
  controllers: [TermsController],
  providers: [TermsService, TermsRepository],
})
export class TermsModule {}
