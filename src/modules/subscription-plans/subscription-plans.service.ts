import { Injectable } from '@nestjs/common';
import { SubscriptionPlanResponseDto } from './dto/subscription-plan-response.dto';
import { SubscriptionPlansRepository } from './subscription-plans.repository';
import { SubscriptionPlanRecord } from './subscription-plans.types';

@Injectable()
export class SubscriptionPlansService {
  constructor(
    private readonly subscriptionPlansRepository: SubscriptionPlansRepository,
  ) {}

  getSubscriptionPlans = async (): Promise<SubscriptionPlanResponseDto[]> => {
    const subscriptionPlans =
      await this.subscriptionPlansRepository.findActivePlans();

    return subscriptionPlans.map(this.toSubscriptionPlanResponseDto);
  };

  private toSubscriptionPlanResponseDto = (
    subscriptionPlan: SubscriptionPlanRecord,
  ): SubscriptionPlanResponseDto => ({
    id: Number(subscriptionPlan.id),
    code: subscriptionPlan.code,
    name: subscriptionPlan.name,
    price: subscriptionPlan.price,
    billingCycle: subscriptionPlan.billingCycle,
    description: subscriptionPlan.description,
    features: subscriptionPlan.planFeatures.map((planFeature) => ({
      code: planFeature.planFeature.code,
      name: planFeature.planFeature.name,
      description: planFeature.planFeature.description,
      valueType: planFeature.planFeature.valueType,
      unit: planFeature.planFeature.unit,
      isEnabled: planFeature.isEnabled,
      limitValue: planFeature.limitValue,
      textValue: planFeature.textValue,
    })),
  });
}
