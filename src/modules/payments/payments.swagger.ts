import { applyDecorators } from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CancelPaymentRequestDto } from './dto/cancel-payment-request.dto';
import { ConfirmPaymentRequestDto } from './dto/confirm-payment-request.dto';
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

export const ApiConfirmPayment = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: '일반 결제 승인' }),
    ApiBody({ type: ConfirmPaymentRequestDto }),
    ApiOkResponse({
      description: '결제 승인 성공',
      schema: {
        example: {
          success: true,
          code: 'COMMON200',
          message: '요청이 성공했습니다.',
          data: {
            paymentId: 1,
            orderId: 'ORDER_1_lzk6q9x7_a1b2c3d4',
            orderName: '플러스 플랜',
            amount: 2900,
            status: 'DONE',
            paymentMethod: '카드',
            providerPaymentId: 'tgen_20260717abcdef',
            receiptUrl:
              'https://dashboard.tosspayments.com/receipt/redirection?...',
            paidAt: '2026-07-17T10:00:00.000Z',
            createdAt: '2026-07-17T09:59:00.000Z',
          },
        },
      },
    }),
    ApiBadRequestResponse({
      description: '요청값 오류 또는 금액 불일치',
      schema: {
        example: failResponse(
          'PAYMENT400',
          '결제 금액이 주문 금액과 일치하지 않습니다.',
        ),
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Access Token 없음 또는 유효하지 않음',
      schema: {
        example: failResponse('AUTH401', '유효하지 않은 Access Token입니다.'),
      },
    }),
    ApiNotFoundResponse({
      description: '결제 주문을 찾을 수 없음',
      schema: {
        example: failResponse('PAYMENT404', '결제 주문을 찾을 수 없습니다.'),
      },
    }),
    ApiConflictResponse({
      description: '승인할 수 없는 결제 상태',
      schema: {
        example: failResponse(
          'PAYMENT409',
          '결제를 승인할 수 없는 상태입니다.',
        ),
      },
    }),
    ApiInternalServerErrorResponse({
      description: '결제 설정 누락 또는 서버 내부 오류',
      schema: {
        example: failResponse('PAYMENT500', '결제 설정이 누락되었습니다.'),
      },
    }),
    ApiBadGatewayResponse({
      description: '결제 제공자 통신 오류',
      schema: {
        example: failResponse(
          'PAYMENT502',
          '결제 제공자와 통신하는 중 오류가 발생했습니다.',
        ),
      },
    }),
  );

export const ApiGetPayments = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: '내 결제 내역 조회' }),
    ApiQuery({ name: 'page', required: false, example: 1 }),
    ApiQuery({ name: 'size', required: false, example: 20 }),
    ApiQuery({ name: 'status', required: false, example: 'DONE' }),
    ApiOkResponse({
      description: '내 결제 내역 조회 성공',
      schema: {
        example: {
          success: true,
          code: 'COMMON200',
          message: '요청이 성공했습니다.',
          data: {
            items: [
              {
                paymentId: 1,
                orderId: 'ORDER_1_lzk6q9x7_a1b2c3d4',
                orderName: '플러스 플랜',
                amount: 2900,
                status: 'DONE',
                paymentMethod: '카드',
                providerPaymentId: 'tgen_20260717abcdef',
                receiptUrl:
                  'https://dashboard.tosspayments.com/receipt/redirection?...',
                paidAt: '2026-07-17T10:00:00.000Z',
                createdAt: '2026-07-17T09:59:00.000Z',
              },
            ],
            page: 1,
            size: 20,
            total: 1,
            totalPages: 1,
          },
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Access Token 없음 또는 유효하지 않음',
      schema: {
        example: failResponse('AUTH401', '유효하지 않은 Access Token입니다.'),
      },
    }),
  );

export const ApiGetPayment = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: '결제 상세 조회' }),
    ApiParam({ name: 'paymentId', example: 1 }),
    ApiOkResponse({
      description: '결제 상세 조회 성공',
      schema: {
        example: {
          success: true,
          code: 'COMMON200',
          message: '요청이 성공했습니다.',
          data: {
            paymentId: 1,
            orderId: 'ORDER_1_lzk6q9x7_a1b2c3d4',
            orderName: '플러스 플랜',
            amount: 2900,
            status: 'DONE',
            paymentMethod: '카드',
            providerPaymentId: 'tgen_20260717abcdef',
            receiptUrl:
              'https://dashboard.tosspayments.com/receipt/redirection?...',
            paidAt: '2026-07-17T10:00:00.000Z',
            createdAt: '2026-07-17T09:59:00.000Z',
          },
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Access Token 없음 또는 유효하지 않음',
      schema: {
        example: failResponse('AUTH401', '유효하지 않은 Access Token입니다.'),
      },
    }),
    ApiNotFoundResponse({
      description: '결제 내역을 찾을 수 없음',
      schema: {
        example: failResponse('PAYMENT404', '결제 내역을 찾을 수 없습니다.'),
      },
    }),
  );

export const ApiCancelPayment = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: '결제 취소/환불' }),
    ApiParam({ name: 'paymentId', example: 1 }),
    ApiBody({ type: CancelPaymentRequestDto }),
    ApiOkResponse({
      description: '결제 취소 성공',
      schema: {
        example: {
          success: true,
          code: 'PAYMENT200',
          message: '결제가 취소되었습니다.',
          data: {
            paymentId: 1,
            orderId: 'ORDER_1_lzk6q9x7_a1b2c3d4',
            amount: 2900,
            status: 'CANCELED',
            canceledAt: '2026-07-20T10:00:00.000Z',
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
      description: '결제 내역을 찾을 수 없음',
      schema: {
        example: failResponse('PAYMENT404', '결제 내역을 찾을 수 없습니다.'),
      },
    }),
    ApiConflictResponse({
      description: '취소할 수 없는 결제 상태',
      schema: {
        example: failResponse('PAYMENT409', '취소할 수 없는 결제 상태입니다.'),
      },
    }),
    ApiInternalServerErrorResponse({
      description: '결제 설정 누락 또는 서버 내부 오류',
      schema: {
        example: failResponse('PAYMENT500', '결제 설정이 누락되었습니다.'),
      },
    }),
    ApiBadGatewayResponse({
      description: '결제 제공자 통신 오류',
      schema: {
        example: failResponse(
          'PAYMENT502',
          '결제 제공자와 통신하는 중 오류가 발생했습니다.',
        ),
      },
    }),
  );
