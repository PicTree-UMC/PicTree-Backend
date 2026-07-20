import { applyDecorators } from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CreateBillingKeyRequestDto } from './dto/create-billing-key-request.dto';

const failResponse = (code: string, message: string) => ({
  success: false,
  code,
  message,
});

const billingKeyExample = {
  billingKeyId: 1,
  paymentProvider: 'TOSS',
  cardCompany: '11',
  cardNumberMasked: '433012******1234',
  status: 'ACTIVE',
  issuedAt: '2026-07-20T10:00:00.000Z',
};

const protectedBillingKeyResponses = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiUnauthorizedResponse({
      description: 'Access Token 없음 또는 유효하지 않음',
      schema: {
        example: failResponse('AUTH401', '유효하지 않은 Access Token입니다.'),
      },
    }),
  );

export const ApiGetBillingCustomerKey = () =>
  applyDecorators(
    protectedBillingKeyResponses(),
    ApiOperation({ summary: '자동결제 customerKey 조회' }),
    ApiOkResponse({
      description: 'customerKey 조회 성공',
      schema: {
        example: {
          success: true,
          code: 'COMMON200',
          message: '요청이 성공했습니다.',
          data: {
            customerKey: 'BILLING_4f75b7d3d2b7b37b8c4e...',
          },
        },
      },
    }),
    ApiInternalServerErrorResponse({
      description: 'customerKey 생성 설정 누락',
      schema: {
        example: failResponse(
          'BILLING_KEY500',
          '자동결제 설정이 누락되었습니다.',
        ),
      },
    }),
  );

export const ApiCreateBillingKey = () =>
  applyDecorators(
    protectedBillingKeyResponses(),
    ApiOperation({ summary: '자동결제 카드 등록' }),
    ApiBody({ type: CreateBillingKeyRequestDto }),
    ApiCreatedResponse({
      description: '자동결제 카드 등록 성공',
      schema: {
        example: {
          success: true,
          code: 'BILLING_KEY201',
          message: '자동결제 수단이 등록되었습니다.',
          data: billingKeyExample,
        },
      },
    }),
    ApiBadRequestResponse({
      description: '요청값 또는 customerKey 오류',
      schema: {
        example: failResponse(
          'BILLING_KEY400',
          'customerKey가 유효하지 않습니다.',
        ),
      },
    }),
    ApiBadGatewayResponse({
      description: '토스페이먼츠 통신 오류',
      schema: {
        example: failResponse(
          'BILLING_KEY502',
          '결제 제공자와 통신하는 중 오류가 발생했습니다.',
        ),
      },
    }),
  );

export const ApiGetBillingKeys = () =>
  applyDecorators(
    protectedBillingKeyResponses(),
    ApiOperation({ summary: '내 자동결제 수단 조회' }),
    ApiOkResponse({
      description: '자동결제 수단 조회 성공',
      schema: {
        example: {
          success: true,
          code: 'COMMON200',
          message: '요청이 성공했습니다.',
          data: [billingKeyExample],
        },
      },
    }),
  );

export const ApiDeactivateBillingKey = () =>
  applyDecorators(
    protectedBillingKeyResponses(),
    ApiOperation({ summary: '자동결제 수단 삭제' }),
    ApiParam({ name: 'billingKeyId', example: 1 }),
    ApiOkResponse({
      description: '자동결제 수단 삭제 성공',
      schema: {
        example: {
          success: true,
          code: 'BILLING_KEY200',
          message: '자동결제 수단이 삭제되었습니다.',
          data: {
            billingKeyId: 1,
            status: 'DEACTIVATED',
            deactivatedAt: '2026-07-20T11:00:00.000Z',
          },
        },
      },
    }),
    ApiNotFoundResponse({
      description: '자동결제 수단 없음 또는 소유자 불일치',
      schema: {
        example: failResponse(
          'BILLING_KEY404',
          '자동결제 수단을 찾을 수 없습니다.',
        ),
      },
    }),
    ApiBadGatewayResponse({
      description: '토스페이먼츠 통신 오류',
      schema: {
        example: failResponse(
          'BILLING_KEY502',
          '결제 제공자와 통신하는 중 오류가 발생했습니다.',
        ),
      },
    }),
  );
