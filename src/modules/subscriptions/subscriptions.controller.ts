import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../../common/responses/api.response';
import { SuccessCode } from '../../common/responses/success-code';
import { AccessTokenGuard } from '../auth/access-token.guard';
import type { JwtPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateSubscriptionRequestDto } from './dto/create-subscription-request.dto';
import { SubscriptionResponseDto } from './dto/subscription-response.dto';
import {
  ApiCancelSubscription,
  ApiCreateSubscription,
  ApiGetMySubscription,
  ApiResumeSubscription,
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

  @Post(':subscriptionId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiCancelSubscription()
  async cancelSubscription(
    @CurrentUser() currentUser: JwtPayload,
    @Param('subscriptionId', ParseIntPipe) subscriptionId: number,
  ): Promise<ApiResponse<SubscriptionResponseDto>> {
    const data = await this.subscriptionsService.cancelSubscription(
      currentUser.userId,
      subscriptionId,
    );

    return ApiResponse.success(SuccessCode.SUBSCRIPTION_CANCELED, data);
  }

  @Post(':subscriptionId/resume')
  @HttpCode(HttpStatus.OK)
  @ApiResumeSubscription()
  async resumeSubscription(
    @CurrentUser() currentUser: JwtPayload,
    @Param('subscriptionId', ParseIntPipe) subscriptionId: number,
  ): Promise<ApiResponse<SubscriptionResponseDto>> {
    const data = await this.subscriptionsService.resumeSubscription(
      currentUser.userId,
      subscriptionId,
    );

    return ApiResponse.success(SuccessCode.SUBSCRIPTION_RESUMED, data);
  }
}
