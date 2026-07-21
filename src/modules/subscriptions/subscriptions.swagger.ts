import { applyDecorators } from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorCode } from '../../common/exceptions/error-code';
import { SuccessCode } from '../../common/responses/success-code';
import { CreateSubscriptionRequestDto } from './dto/create-subscription-request.dto';

const failResponse = (code: string, message: string) => ({
  success: false,
  code,
  message,
});

const activeSubscriptionExample = {
  subscriptionId: 1,
  status: 'ACTIVE',
  plan: {
    id: 2,
    code: 'PLUS',
    name: '플러스',
    price: 2900,
    billingCycle: 'MONTHLY',
  },
  startedAt: '2026-07-21T10:00:00.000Z',
  expiresAt: '2026-08-21T10:00:00.000Z',
  autoRenew: true,
  nextBillingAt: '2026-08-21T10:00:00.000Z',
};

const protectedSubscriptionResponses = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiUnauthorizedResponse({
      description: 'Access Token 없음 또는 유효하지 않음',
      schema: {
        example: failResponse('AUTH401', '유효하지 않은 Access Token입니다.'),
      },
    }),
  );

export const ApiGetMySubscription = () =>
  applyDecorators(
    protectedSubscriptionResponses(),
    ApiOperation({ summary: '내 구독 조회' }),
    ApiOkResponse({
      description: '내 구독 조회 성공',
      schema: {
        example: {
          success: true,
          code: 'COMMON200',
          message: '요청이 성공했습니다.',
          data: activeSubscriptionExample,
        },
      },
    }),
    ApiNotFoundResponse({
      description: '무료 요금제 정보가 없음',
      schema: {
        example: failResponse(
          'SUBSCRIPTION404',
          '구독 요금제를 찾을 수 없습니다.',
        ),
      },
    }),
  );

export const ApiCreateSubscription = () =>
  applyDecorators(
    protectedSubscriptionResponses(),
    ApiOperation({ summary: '구독 시작' }),
    ApiBody({ type: CreateSubscriptionRequestDto }),
    ApiCreatedResponse({
      description: '구독 시작 성공',
      schema: {
        example: {
          success: true,
          code: 'SUBSCRIPTION201',
          message: '구독이 시작되었습니다.',
          data: activeSubscriptionExample,
        },
      },
    }),
    ApiBadRequestResponse({
      description: '요청값 또는 구독 불가 요금제',
      schema: {
        example: failResponse(
          'SUBSCRIPTION400',
          '구독할 수 없는 요금제입니다.',
        ),
      },
    }),
    ApiNotFoundResponse({
      description: '요금제 또는 결제 수단을 찾을 수 없음',
      schema: {
        example: failResponse(
          'SUBSCRIPTION404',
          '사용 가능한 자동결제 수단을 찾을 수 없습니다.',
        ),
      },
    }),
    ApiConflictResponse({
      description: '기존 구독 또는 구독 결제 진행 중',
      schema: {
        example: failResponse(
          'SUBSCRIPTION409',
          '이미 이용 중인 구독이 있습니다.',
        ),
      },
    }),
    ApiInternalServerErrorResponse({
      description: '결제 설정 누락 또는 서버 오류',
      schema: {
        example: failResponse('PAYMENT500', '결제 설정이 누락되었습니다.'),
      },
    }),
    ApiBadGatewayResponse({
      description: '토스페이먼츠 자동결제 실패',
      schema: {
        example: failResponse(
          'SUBSCRIPTION502',
          '구독 결제를 완료하지 못했습니다.',
        ),
      },
    }),
  );

const subscriptionRenewalResponses = (
  summary: string,
  successMessage: string,
  conflictMessage: string,
  autoRenew: boolean,
) =>
  applyDecorators(
    protectedSubscriptionResponses(),
    ApiOperation({ summary }),
    ApiParam({ name: 'subscriptionId', example: 1 }),
    ApiOkResponse({
      description: successMessage,
      schema: {
        example: {
          success: true,
          code: 'SUBSCRIPTION200',
          message: successMessage,
          data: {
            ...activeSubscriptionExample,
            autoRenew,
            nextBillingAt: autoRenew
              ? activeSubscriptionExample.nextBillingAt
              : null,
          },
        },
      },
    }),
    ApiNotFoundResponse({
      description: '구독을 찾을 수 없음',
      schema: {
        example: failResponse('SUBSCRIPTION404', '구독을 찾을 수 없습니다.'),
      },
    }),
    ApiConflictResponse({
      description: conflictMessage,
      schema: {
        example: failResponse('SUBSCRIPTION409', conflictMessage),
      },
    }),
  );

export const ApiCancelSubscription = () =>
  subscriptionRenewalResponses(
    '구독 해지',
    SuccessCode.SUBSCRIPTION_CANCELED.message,
    ErrorCode.SUBSCRIPTION_CANCEL_NOT_ALLOWED.message,
    false,
  );

export const ApiResumeSubscription = () =>
  subscriptionRenewalResponses(
    '구독 자동갱신 재개',
    SuccessCode.SUBSCRIPTION_RESUMED.message,
    ErrorCode.SUBSCRIPTION_RESUME_NOT_ALLOWED.message,
    true,
  );
