import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CalendarVisitRecord } from './calendar.types';

@Injectable()
export class CalendarRepository {
  constructor(private readonly prisma: PrismaService) {}

  findCreatedDatesByUserAndRange = (
    userId: number,
    start: Date,
    end: Date,
  ): Promise<CalendarVisitRecord[]> => {
    return this.prisma.tree.findMany({
      where: {
        userId: BigInt(userId),
        deletedAt: null,
        createdAt: {
          gte: start,
          lt: end,
        },
      },
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  };
}
