import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CreatePaymentOrderRequestDto } from './dto/create-payment-order-request.dto';

const failResponse = (code: string, message: string) => ({
  success: false,
  code,
  message,
});

export const ApiCreatePaymentOrder = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: '결제 주문 생성' }),
    ApiBody({ type: CreatePaymentOrderRequestDto }),
    ApiOkResponse({
      description: '결제 주문 생성 성공',
      schema: {
        example: {
          success: true,
          code: 'COMMON200',
          message: '요청이 성공했습니다.',
          data: {
            orderId: 'ORDER_1_lzk6q9x7_a1b2c3d4',
            orderName: '플러스 플랜',
            amount: 2900,
            customerKey: 'USER_1',
          },
        },
      },
    }),
    ApiBadRequestResponse({
      description: '요청값 오류',
      schema: {
        example: failResponse('COMMON400', '잘못된 요청입니다.'),
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Access Token 없음 또는 유효하지 않음',
      schema: {
        example: failResponse('AUTH401', '유효하지 않은 Access Token입니다.'),
      },
    }),
    ApiNotFoundResponse({
      description: '구독 요금제를 찾을 수 없음',
      schema: {
        example: failResponse('PAYMENT404', '구독 요금제를 찾을 수 없습니다.'),
      },
    }),
    ApiInternalServerErrorResponse({
      description: '서버 내부 오류',
      schema: {
        example: failResponse('COMMON500', '서버 내부 오류입니다.'),
      },
    }),
  );
