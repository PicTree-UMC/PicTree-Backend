import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TermsAgreementsController } from './terms-agreements.controller';
import { TermsController } from './terms.controller';
import { TermsRepository } from './terms.repository';
import { TermsService } from './terms.service';

@Module({
  imports: [AuthModule],
  controllers: [TermsController, TermsAgreementsController],
  providers: [TermsService, TermsRepository],
})
export class TermsModule {}
