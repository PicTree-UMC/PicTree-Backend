import { Prisma } from '@prisma/client';

export type SubscriptionPlanRecord = Prisma.SubscriptionPlanGetPayload<{
  include: {
    planFeatures: {
      include: {
        planFeature: true;
      };
    };
  };
}>;
