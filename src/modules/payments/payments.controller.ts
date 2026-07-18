import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
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
import { ConfirmPaymentRequestDto } from './dto/confirm-payment-request.dto';
import { GetPaymentsQueryDto } from './dto/get-payments-query.dto';
import { PaymentListResponseDto } from './dto/payment-list-response.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import {
  ApiConfirmPayment,
  ApiGetPayment,
  ApiGetPayments,
} from './payments.swagger';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller('payments')
@UseGuards(AccessTokenGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @ApiConfirmPayment()
  async confirmPayment(
    @CurrentUser() currentUser: JwtPayload,
    @Body() confirmPaymentRequestDto: ConfirmPaymentRequestDto,
  ): Promise<ApiResponse<PaymentResponseDto>> {
    const data = await this.paymentsService.confirmPayment(
      currentUser.userId,
      confirmPaymentRequestDto,
    );

    return ApiResponse.success(SuccessCode.OK, data);
  }

  @Get()
  @ApiGetPayments()
  async getMyPayments(
    @CurrentUser() currentUser: JwtPayload,
    @Query() getPaymentsQueryDto: GetPaymentsQueryDto,
  ): Promise<ApiResponse<PaymentListResponseDto>> {
    const data = await this.paymentsService.getMyPayments(
      currentUser.userId,
      getPaymentsQueryDto,
    );

    return ApiResponse.success(SuccessCode.OK, data);
  }

  @Get(':paymentId')
  @ApiGetPayment()
  async getMyPayment(
    @CurrentUser() currentUser: JwtPayload,
    @Param('paymentId', ParseIntPipe) paymentId: number,
  ): Promise<ApiResponse<PaymentResponseDto>> {
    const data = await this.paymentsService.getMyPayment(
      currentUser.userId,
      paymentId,
    );

    return ApiResponse.success(SuccessCode.OK, data);
  }
}
