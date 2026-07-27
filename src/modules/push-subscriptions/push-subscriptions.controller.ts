import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../../common/responses/api.response';
import { SuccessCode } from '../../common/responses/success-code';
import { AccessTokenGuard } from '../auth/access-token.guard';
import type { JwtPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreatePushSubscriptionRequestDto } from './dto/create-push-subscription-request.dto';
import { PushSubscriptionResponseDto } from './dto/push-subscription-response.dto';
import { PushSubscriptionsService } from './push-subscriptions.service';
import {
  ApiDeactivatePushSubscription,
  ApiGetMyPushSubscriptions,
  ApiRegisterPushSubscription,
} from './push-subscriptions.swagger';

@ApiTags('Push Subscriptions')
@Controller('push-subscriptions')
@UseGuards(AccessTokenGuard)
export class PushSubscriptionsController {
  constructor(
    private readonly pushSubscriptionsService: PushSubscriptionsService,
  ) {}

  @Post()
  @ApiRegisterPushSubscription()
  async register(
    @CurrentUser() currentUser: JwtPayload,
    @Body() request: CreatePushSubscriptionRequestDto,
  ): Promise<ApiResponse<PushSubscriptionResponseDto>> {
    const data = await this.pushSubscriptionsService.register(
      currentUser.userId,
      request,
    );

    return ApiResponse.success(SuccessCode.CREATED, data);
  }

  @Get('me')
  @ApiGetMyPushSubscriptions()
  async findMine(
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<ApiResponse<PushSubscriptionResponseDto[]>> {
    const data = await this.pushSubscriptionsService.findMine(
      currentUser.userId,
    );

    return ApiResponse.success(SuccessCode.OK, data);
  }

  @Patch(':subscriptionId/deactivate')
  @ApiDeactivatePushSubscription()
  async deactivate(
    @CurrentUser() currentUser: JwtPayload,
    @Param('subscriptionId', ParseIntPipe) subscriptionId: number,
  ): Promise<ApiResponse<null>> {
    await this.pushSubscriptionsService.deactivate(
      currentUser.userId,
      subscriptionId,
    );

    return ApiResponse.success(SuccessCode.OK, null);
  }
}
