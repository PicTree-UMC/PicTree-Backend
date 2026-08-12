import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionPlanRecord } from './subscription-plans.types';

@Injectable()
export class SubscriptionPlansRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActivePlans = (): Promise<SubscriptionPlanRecord[]> => {
    return this.prisma.subscriptionPlan.findMany({
      where: {
        isActive: true,
      },
      include: {
        planFeatures: {
          include: {
            planFeature: true,
          },
          orderBy: {
            planFeature: {
              code: 'asc',
            },
          },
        },
      },
      orderBy: {
        price: 'asc',
      },
    });
  };
}
