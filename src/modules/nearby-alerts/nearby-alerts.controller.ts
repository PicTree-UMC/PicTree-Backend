import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../../common/responses/api.response';
import { SuccessCode } from '../../common/responses/success-code';
import { AccessTokenGuard } from '../auth/access-token.guard';
import type { JwtPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { CheckNearbyAlertRequestDto } from './dto/check-nearby-alert-request.dto';
import { NearbyAlertQueryDto } from './dto/nearby-alert-query.dto';
import {
  CheckNearbyAlertResponseDto,
  NearbyAlertLogListResponseDto,
  NearbyAlertLogResponseDto,
} from './dto/nearby-alert-response.dto';
import {
  ApiCheckNearbyAlerts,
  ApiDeleteNearbyAlertLog,
  ApiGetNearbyAlertLogs,
  ApiOpenNearbyAlertLog,
} from './nearby-alerts.swagger';
import { NearbyAlertsService } from './nearby-alerts.service';

@ApiTags('Nearby Alerts')
@Controller('nearby-alerts')
@UseGuards(AccessTokenGuard)
export class NearbyAlertsController {
  constructor(private readonly nearbyAlertsService: NearbyAlertsService) {}

  @Post('check')
  @ApiCheckNearbyAlerts()
  async check(
    @CurrentUser() currentUser: JwtPayload,
    @Body() request: CheckNearbyAlertRequestDto,
  ): Promise<ApiResponse<CheckNearbyAlertResponseDto>> {
    const data = await this.nearbyAlertsService.check(
      currentUser.userId,
      request,
    );
    return ApiResponse.success(SuccessCode.NEARBY_ALERT_CHECKED, data);
  }

  @Get('logs')
  @ApiGetNearbyAlertLogs()
  async findLogs(
    @CurrentUser() currentUser: JwtPayload,
    @Query() query: NearbyAlertQueryDto,
  ): Promise<ApiResponse<NearbyAlertLogListResponseDto>> {
    const data = await this.nearbyAlertsService.findLogs(
      currentUser.userId,
      query,
    );
    return ApiResponse.success(SuccessCode.NEARBY_ALERT_LOGS_RETRIEVED, data);
  }

  @Patch('logs/:alertLogId/open')
  @ApiOpenNearbyAlertLog()
  async open(
    @CurrentUser() currentUser: JwtPayload,
    @Param('alertLogId', ParseIntPipe) alertLogId: number,
  ): Promise<ApiResponse<NearbyAlertLogResponseDto>> {
    const data = await this.nearbyAlertsService.open(
      currentUser.userId,
      alertLogId,
    );
    return ApiResponse.success(SuccessCode.NEARBY_ALERT_OPENED, data);
  }

  @Delete('logs/:alertLogId')
  @ApiDeleteNearbyAlertLog()
  async delete(
    @CurrentUser() currentUser: JwtPayload,
    @Param('alertLogId', ParseIntPipe) alertLogId: number,
  ): Promise<ApiResponse<null>> {
    await this.nearbyAlertsService.delete(currentUser.userId, alertLogId);
    return ApiResponse.success(SuccessCode.NEARBY_ALERT_DELETED, null);
  }
}
