import { Injectable } from '@nestjs/common';
import { TermResponseDto } from './dto/term-response.dto';
import { TermsRepository } from './terms.repository';
import { TermRecord } from './terms.types';

@Injectable()
export class TermsService {
  constructor(private readonly termsRepository: TermsRepository) {}

  getTerms = async (): Promise<TermResponseDto[]> => {
    const terms = await this.termsRepository.findActiveTerms(new Date());

    return terms.map(this.toTermResponseDto);
  };

  private toTermResponseDto = (term: TermRecord): TermResponseDto => ({
    id: Number(term.id),
    title: term.title,
    type: term.type,
    version: term.version,
    contentUrl: term.contentUrl,
    isRequired: term.isRequired,
    effectiveFrom: term.effectiveFrom,
  });
}
