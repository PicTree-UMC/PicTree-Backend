import {
  Body,
  Controller,
  Delete,
  Get,
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
import {
  ApiCreateBillingKey,
  ApiDeactivateBillingKey,
  ApiGetBillingCustomerKey,
  ApiGetBillingKeys,
} from './billing-keys.swagger';
import { BillingKeysService } from './billing-keys.service';
import { BillingCustomerKeyResponseDto } from './dto/billing-customer-key-response.dto';
import { BillingKeyResponseDto } from './dto/billing-key-response.dto';
import { CreateBillingKeyRequestDto } from './dto/create-billing-key-request.dto';
import { DeactivateBillingKeyResponseDto } from './dto/deactivate-billing-key-response.dto';

@ApiTags('Billing Keys')
@Controller('billing-keys')
@UseGuards(AccessTokenGuard)
export class BillingKeysController {
  constructor(private readonly billingKeysService: BillingKeysService) {}

  @Get('customer-key')
  @ApiGetBillingCustomerKey()
  getCustomerKey(
    @CurrentUser() currentUser: JwtPayload,
  ): ApiResponse<BillingCustomerKeyResponseDto> {
    const data = this.billingKeysService.getCustomerKey(currentUser.userId);

    return ApiResponse.success(SuccessCode.OK, data);
  }

  @Post()
  @ApiCreateBillingKey()
  async createBillingKey(
    @CurrentUser() currentUser: JwtPayload,
    @Body() createBillingKeyRequestDto: CreateBillingKeyRequestDto,
  ): Promise<ApiResponse<BillingKeyResponseDto>> {
    const data = await this.billingKeysService.createBillingKey(
      currentUser.userId,
      createBillingKeyRequestDto,
    );

    return ApiResponse.success(SuccessCode.BILLING_KEY_ISSUED, data);
  }

  @Get()
  @ApiGetBillingKeys()
  async getMyBillingKeys(
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<ApiResponse<BillingKeyResponseDto[]>> {
    const data = await this.billingKeysService.getMyBillingKeys(
      currentUser.userId,
    );

    return ApiResponse.success(SuccessCode.OK, data);
  }

  @Delete(':billingKeyId')
  @ApiDeactivateBillingKey()
  async deactivateBillingKey(
    @CurrentUser() currentUser: JwtPayload,
    @Param('billingKeyId', ParseIntPipe) billingKeyId: number,
  ): Promise<ApiResponse<DeactivateBillingKeyResponseDto>> {
    const data = await this.billingKeysService.deactivateBillingKey(
      currentUser.userId,
      billingKeyId,
    );

    return ApiResponse.success(SuccessCode.BILLING_KEY_DEACTIVATED, data);
  }
}
