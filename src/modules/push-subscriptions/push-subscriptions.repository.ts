import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PushSubscriptionRecord,
  UpsertPushSubscriptionData,
} from './push-subscriptions.types';

@Injectable()
export class PushSubscriptionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  upsert = (
    data: UpsertPushSubscriptionData,
  ): Promise<PushSubscriptionRecord> =>
    this.prisma.pushSubscription.upsert({
      where: { endpointHash: data.endpointHash },
      create: { ...data, isActive: true },
      update: {
        userId: data.userId,
        endpoint: data.endpoint,
        p256dhKey: data.p256dhKey,
        authKey: data.authKey,
        userAgent: data.userAgent,
        isActive: true,
      },
    });

  findAllByUser = (userId: bigint): Promise<PushSubscriptionRecord[]> =>
    this.prisma.pushSubscription.findMany({
      where: { userId },
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
    });

  findByIdAndUser = (
    subscriptionId: bigint,
    userId: bigint,
  ): Promise<PushSubscriptionRecord | null> =>
    this.prisma.pushSubscription.findFirst({
      where: { id: subscriptionId, userId },
    });

  deactivate = (subscriptionId: bigint): Promise<PushSubscriptionRecord> =>
    this.prisma.pushSubscription.update({
      where: { id: subscriptionId },
      data: { isActive: false },
    });

  findActiveByUser = (userId: bigint): Promise<PushSubscriptionRecord[]> =>
    this.prisma.pushSubscription.findMany({
      where: { userId, isActive: true },
    });
}
