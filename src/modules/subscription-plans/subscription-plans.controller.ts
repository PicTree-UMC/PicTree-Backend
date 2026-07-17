import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../../common/responses/api.response';
import { SuccessCode } from '../../common/responses/success-code';
import { SubscriptionPlanResponseDto } from './dto/subscription-plan-response.dto';
import { ApiGetSubscriptionPlans } from './subscription-plans.swagger';
import { SubscriptionPlansService } from './subscription-plans.service';

@ApiTags('Subscription Plans')
@Controller('subscription-plans')
export class SubscriptionPlansController {
  constructor(
    private readonly subscriptionPlansService: SubscriptionPlansService,
  ) {}

  @Get()
  @ApiGetSubscriptionPlans()
  async getSubscriptionPlans(): Promise<
    ApiResponse<SubscriptionPlanResponseDto[]>
  > {
    const data = await this.subscriptionPlansService.getSubscriptionPlans();

    return ApiResponse.success(SuccessCode.OK, data);
  }
}
