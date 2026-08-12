import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TermRecord, TermsUserRecord } from './terms.types';

@Injectable()
export class TermsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveTerms = (now: Date): Promise<TermRecord[]> => {
    return this.prisma.term.findMany({
      where: {
        isActive: true,
        effectiveFrom: {
          lte: now,
        },
      },
      orderBy: [{ isRequired: 'desc' }, { type: 'asc' }, { version: 'desc' }],
    });
  };

  findUserById = (userId: number): Promise<TermsUserRecord | null> => {
    return this.prisma.user.findUnique({
      where: {
        id: BigInt(userId),
      },
      select: {
        id: true,
        status: true,
      },
    });
  };

  createTermAgreements = async (
    userId: number,
    termIds: number[],
    agreedAt: Date,
  ): Promise<void> => {
    await this.prisma.userTermsAgreement.createMany({
      data: termIds.map((termId) => ({
        userId: BigInt(userId),
        termId: BigInt(termId),
        isAgreed: true,
        agreedAt,
      })),
    });
  };
}
