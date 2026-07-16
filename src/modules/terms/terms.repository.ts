import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TermRecord } from './terms.types';

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
}
