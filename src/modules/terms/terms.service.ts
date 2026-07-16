import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code';
import { AgreeTermsRequestDto } from './dto/agree-terms-request.dto';
import { TermResponseDto } from './dto/term-response.dto';
import { TermsAgreementResponseDto } from './dto/terms-agreement-response.dto';
import { TermsRepository } from './terms.repository';
import { TermRecord, TermsUserRecord } from './terms.types';

@Injectable()
export class TermsService {
  constructor(private readonly termsRepository: TermsRepository) {}

  getTerms = async (): Promise<TermResponseDto[]> => {
    const terms = await this.termsRepository.findActiveTerms(new Date());

    return terms.map(this.toTermResponseDto);
  };

  agreeTerms = async (
    userId: number,
    agreeTermsRequestDto: AgreeTermsRequestDto,
  ): Promise<TermsAgreementResponseDto> => {
    const user = await this.getUserOrThrow(userId);

    this.validateAvailableUser(user);

    const agreedTermIds = agreeTermsRequestDto.agreedTermIds;
    const agreedAt = new Date();
    const activeTerms = await this.termsRepository.findActiveTerms(agreedAt);

    this.validateActiveTerms(agreedTermIds, activeTerms);
    this.validateRequiredTermsAgreed(agreedTermIds, activeTerms);

    await this.termsRepository.createTermAgreements(
      userId,
      agreedTermIds,
      agreedAt,
    );

    return {
      agreedTermIds,
      agreedAt,
    };
  };

  private getUserOrThrow = async (userId: number): Promise<TermsUserRecord> => {
    const user = await this.termsRepository.findUserById(userId);

    if (!user) {
      throw new AppException(ErrorCode.USER_NOT_FOUND);
    }

    return user;
  };

  private validateAvailableUser = (user: TermsUserRecord): void => {
    if (user.status !== 'ACTIVE') {
      throw new AppException(ErrorCode.USER_UNAVAILABLE);
    }
  };

  private validateActiveTerms = (
    agreedTermIds: number[],
    activeTerms: TermRecord[],
  ): void => {
    const activeTermIdSet = new Set(activeTerms.map((term) => Number(term.id)));
    const hasInactiveTerm = agreedTermIds.some(
      (termId) => !activeTermIdSet.has(termId),
    );

    if (hasInactiveTerm) {
      throw new AppException(ErrorCode.TERMS_NOT_FOUND);
    }
  };

  private validateRequiredTermsAgreed = (
    agreedTermIds: number[],
    activeTerms: TermRecord[],
  ): void => {
    const agreedTermIdSet = new Set(agreedTermIds);
    const hasMissingRequiredTerm = activeTerms
      .filter((term) => term.isRequired)
      .some((term) => !agreedTermIdSet.has(Number(term.id)));

    if (hasMissingRequiredTerm) {
      throw new AppException(ErrorCode.TERMS_REQUIRED_AGREEMENT_MISSING);
    }
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
