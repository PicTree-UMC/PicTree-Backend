import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../../common/responses/api.response';
import { SuccessCode } from '../../common/responses/success-code';
import { AccessTokenGuard } from '../auth/access-token.guard';
import type { JwtPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateSubscriptionRequestDto } from './dto/create-subscription-request.dto';
import { SubscriptionResponseDto } from './dto/subscription-response.dto';
import {
  ApiCreateSubscription,
  ApiGetMySubscription,
} from './subscriptions.swagger';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('Subscriptions')
@Controller('subscriptions')
@UseGuards(AccessTokenGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('me')
  @ApiGetMySubscription()
  async getMySubscription(
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<ApiResponse<SubscriptionResponseDto>> {
    const data = await this.subscriptionsService.getMySubscription(
      currentUser.userId,
    );

    return ApiResponse.success(SuccessCode.OK, data);
  }

  @Post()
  @ApiCreateSubscription()
  async createSubscription(
    @CurrentUser() currentUser: JwtPayload,
    @Body() request: CreateSubscriptionRequestDto,
  ): Promise<ApiResponse<SubscriptionResponseDto>> {
    const data = await this.subscriptionsService.createSubscription(
      currentUser.userId,
      request,
    );

    return ApiResponse.success(SuccessCode.SUBSCRIPTION_STARTED, data);
  }
}
