import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../../common/responses/api.response';
import { SuccessCode } from '../../common/responses/success-code';
import { AccessTokenGuard } from '../auth/access-token.guard';
import type { JwtPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreatePaymentOrderRequestDto } from './dto/create-payment-order-request.dto';
import { PaymentOrderResponseDto } from './dto/payment-order-response.dto';
import { ApiCreatePaymentOrder } from './payments.swagger';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller('payment-orders')
@UseGuards(AccessTokenGuard)
export class PaymentOrdersController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiCreatePaymentOrder()
  async createPaymentOrder(
    @CurrentUser() currentUser: JwtPayload,
    @Body() createPaymentOrderRequestDto: CreatePaymentOrderRequestDto,
  ): Promise<ApiResponse<PaymentOrderResponseDto>> {
    const data = await this.paymentsService.createPaymentOrder(
      currentUser.userId,
      createPaymentOrderRequestDto,
    );

    return ApiResponse.success(SuccessCode.OK, data);
  }
}
