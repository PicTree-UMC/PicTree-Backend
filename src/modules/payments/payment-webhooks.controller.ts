import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../../common/responses/api.response';
import { SuccessCode } from '../../common/responses/success-code';
import { TossPaymentWebhookRequestDto } from './dto/toss-payment-webhook-request.dto';
import { ApiHandleTossPaymentWebhook } from './payment-webhooks.swagger';
import { PaymentWebhooksService } from './payment-webhooks.service';
import { TossPaymentWebhookHeader } from './payments.constant';

@ApiTags('Payment Webhooks')
@Controller('payments/webhooks')
export class PaymentWebhooksController {
  constructor(
    private readonly paymentWebhooksService: PaymentWebhooksService,
  ) {}

  @Post('toss')
  @HttpCode(HttpStatus.OK)
  @ApiHandleTossPaymentWebhook()
  async handleTossPaymentWebhook(
    @Headers(TossPaymentWebhookHeader.TRANSMISSION_ID)
    transmissionId: string | undefined,
    @Body() request: TossPaymentWebhookRequestDto,
  ): Promise<ApiResponse<null>> {
    await this.paymentWebhooksService.handleTossPaymentWebhook(
      request,
      transmissionId,
    );

    return ApiResponse.success(SuccessCode.PAYMENT_WEBHOOK_RECEIVED, null);
  }
}
