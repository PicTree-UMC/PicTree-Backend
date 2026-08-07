import { Injectable } from '@nestjs/common';
import { AppException } from '../../../common/exceptions/app.exception';
import { ErrorCode } from '../../../common/exceptions/error-code';
import {
  createKstMonthlyAnchor,
  toKstDateParts,
} from '../../../common/utils/kst-date.util';
import { BLOG_DRAFT_LIMIT } from '../blog-drafts.constant';
import { BlogDraftsRepository } from '../blog-drafts.repository';
import { BlogDraftUserRecord } from '../blog-drafts.types';

@Injectable()
export class BlogDraftUsageService {
  constructor(private readonly blogDraftsRepository: BlogDraftsRepository) {}

  validateMonthlyLimit = async (
    userId: number,
    user: BlogDraftUserRecord,
  ): Promise<void> => {
    const now = new Date();
    const [usageStart, usageEnd] = this.resolveUsageWindow(user, now);
    const used = await this.blogDraftsRepository.countGeneratedDraftsInRange(
      userId,
      usageStart,
      usageEnd,
    );
    const limit = this.resolveMonthlyLimit(user, now);

    if (used >= limit) {
      throw new AppException(ErrorCode.BLOG_DRAFT_LIMIT_EXCEEDED);
    }
  };

  consumeUsageWithinLimit = async (
    userId: number,
    user: BlogDraftUserRecord,
    now: Date,
  ): Promise<void> => {
    const [usageStart, usageEnd] = this.resolveUsageWindow(user, now);
    const limit = this.resolveMonthlyLimit(user, now);

    try {
      await this.blogDraftsRepository.consumeUsageWithinLimit(
        BigInt(userId),
        usageStart,
        usageEnd,
        limit,
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'BLOG_DRAFT_LIMIT_EXCEEDED'
      ) {
        throw new AppException(ErrorCode.BLOG_DRAFT_LIMIT_EXCEEDED);
      }

      throw error;
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
        case 'FREE':
        default:
          return BLOG_DRAFT_LIMIT.FREE;
      }
    }

    return BLOG_DRAFT_LIMIT.FREE;
  };

  private resolveUsageWindow = (
    user: BlogDraftUserRecord,
    now: Date,
  ): [Date, Date] => {
    if (user.currentSubscription && user.currentSubscription.expiresAt > now) {
      return this.resolvePaidUsageWindow(
        user.currentSubscription.startedAt,
        now,
      );
    }

    return this.resolveFreeUsageWindow(now);
  };

  private resolveFreeUsageWindow = (now: Date): [Date, Date] => {
    const { year, monthIndex } = toKstDateParts(now);

    return [
      createKstMonthlyAnchor(year, monthIndex, 1),
      createKstMonthlyAnchor(year, monthIndex + 1, 1),
    ];
  };

  private resolvePaidUsageWindow = (
    startedAt: Date,
    now: Date,
  ): [Date, Date] => {
    const { day: startedDay } = toKstDateParts(startedAt);
    const { year, monthIndex } = toKstDateParts(now);
    const currentMonthAnchor = createKstMonthlyAnchor(
      year,
      monthIndex,
      startedDay,
    );

    if (now >= currentMonthAnchor) {
      return [
        currentMonthAnchor,
        createKstMonthlyAnchor(year, monthIndex + 1, startedDay),
      ];
    }

    return [
      createKstMonthlyAnchor(year, monthIndex - 1, startedDay),
      currentMonthAnchor,
    ];
  };
}
