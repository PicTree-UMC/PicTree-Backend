import { applyDecorators } from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBody,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { ErrorCode } from '../../common/exceptions/error-code';
import { SuccessCode } from '../../common/responses/success-code';
import { TossPaymentWebhookRequestDto } from './dto/toss-payment-webhook-request.dto';
import { TossPaymentWebhookHeader } from './payments.constant';

const failResponse = (code: string, message: string) => ({
  success: false,
  code,
  message,
});

export const ApiHandleTossPaymentWebhook = () =>
  applyDecorators(
    ApiOperation({ summary: '토스페이먼츠 결제 상태 웹훅' }),
    ApiHeader({
      name: TossPaymentWebhookHeader.TRANSMISSION_ID,
      required: false,
      description: '토스페이먼츠 웹훅 전송 고유 ID',
    }),
    ApiBody({ type: TossPaymentWebhookRequestDto }),
    ApiOkResponse({
      description: SuccessCode.PAYMENT_WEBHOOK_RECEIVED.message,
      schema: {
        example: {
          success: true,
          code: SuccessCode.PAYMENT_WEBHOOK_RECEIVED.code,
          message: SuccessCode.PAYMENT_WEBHOOK_RECEIVED.message,
          data: null,
        },
      },
    }),
    ApiBadRequestResponse({
      description: ErrorCode.PAYMENT_WEBHOOK_INVALID.message,
      schema: {
        example: failResponse(
          ErrorCode.PAYMENT_WEBHOOK_INVALID.code,
          ErrorCode.PAYMENT_WEBHOOK_INVALID.message,
        ),
      },
    }),
    ApiBadGatewayResponse({
      description: ErrorCode.PAYMENT_WEBHOOK_PROCESSING_FAILED.message,
      schema: {
        example: failResponse(
          ErrorCode.PAYMENT_WEBHOOK_PROCESSING_FAILED.code,
          ErrorCode.PAYMENT_WEBHOOK_PROCESSING_FAILED.message,
        ),
      },
    }),
  );
