import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code';
import { CreatePushSubscriptionRequestDto } from './dto/create-push-subscription-request.dto';
import { PushSubscriptionResponseDto } from './dto/push-subscription-response.dto';
import { PushSubscriptionsRepository } from './push-subscriptions.repository';
import { PushSubscriptionRecord } from './push-subscriptions.types';

@Injectable()
export class PushSubscriptionsService {
  constructor(
    private readonly pushSubscriptionsRepository: PushSubscriptionsRepository,
  ) {}

  register = async (
    userId: number,
    request: CreatePushSubscriptionRequestDto,
  ): Promise<PushSubscriptionResponseDto> => {
    const subscription = await this.pushSubscriptionsRepository.upsert({
      userId: BigInt(userId),
      endpoint: request.endpoint,
      endpointHash: this.hashEndpoint(request.endpoint),
      p256dhKey: request.keys.p256dh,
      authKey: request.keys.auth,
      userAgent: request.userAgent ?? null,
    });

    return this.toResponseDto(subscription);
  };

  findMine = async (userId: number): Promise<PushSubscriptionResponseDto[]> => {
    const subscriptions = await this.pushSubscriptionsRepository.findAllByUser(
      BigInt(userId),
    );

    return subscriptions.map(this.toResponseDto);
  };

  deactivate = async (
    userId: number,
    subscriptionId: number,
  ): Promise<null> => {
    const subscription = await this.pushSubscriptionsRepository.findByIdAndUser(
      BigInt(subscriptionId),
      BigInt(userId),
    );

    if (!subscription) {
      throw new AppException(ErrorCode.PUSH_SUBSCRIPTION_NOT_FOUND);
    }

    if (subscription.isActive) {
      await this.pushSubscriptionsRepository.deactivate(BigInt(subscriptionId));
    }

    return null;
  };

  private hashEndpoint = (endpoint: string): string =>
    createHash('sha256').update(endpoint).digest('hex');

  private toResponseDto = (
    subscription: PushSubscriptionRecord,
  ): PushSubscriptionResponseDto => ({
    subscriptionId: Number(subscription.id),
    endpoint: subscription.endpoint,
    userAgent: subscription.userAgent,
    isActive: subscription.isActive,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
  });
}
