import { applyDecorators } from '@nestjs/common';
import {
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
import { CreatePushSubscriptionRequestDto } from './dto/create-push-subscription-request.dto';

const failResponse = (code: string, message: string) => ({
  success: false,
  code,
  message,
});

const subscriptionExample = {
  subscriptionId: 1,
  endpoint: 'https://fcm.googleapis.com/fcm/send/...',
  userAgent: 'Mozilla/5.0 ...',
  isActive: true,
  createdAt: '2026-07-23T10:00:00.000Z',
  updatedAt: '2026-07-23T10:00:00.000Z',
};

const protectedResponses = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiUnauthorizedResponse({
      schema: {
        example: failResponse('AUTH401', '유효하지 않은 Access Token입니다.'),
      },
    }),
    ApiInternalServerErrorResponse({
      schema: {
        example: failResponse('COMMON500', '서버 내부 오류입니다.'),
      },
    }),
  );

export const ApiRegisterPushSubscription = () =>
  applyDecorators(
    ApiOperation({ summary: 'PWA 푸시 구독 등록' }),
    protectedResponses(),
    ApiBody({ type: CreatePushSubscriptionRequestDto }),
    ApiCreatedResponse({
      schema: {
        example: {
          success: true,
          code: 'PUSH_SUBSCRIPTION201-1',
          message: 'PWA 푸시 구독이 등록되었습니다.',
          data: subscriptionExample,
        },
      },
    }),
    ApiBadRequestResponse({
      schema: { example: failResponse('COMMON400', '잘못된 요청입니다.') },
    }),
  );

export const ApiGetMyPushSubscriptions = () =>
  applyDecorators(
    ApiOperation({ summary: 'PWA 푸시 구독 조회' }),
    protectedResponses(),
    ApiOkResponse({
      schema: {
        example: {
          success: true,
          code: 'PUSH_SUBSCRIPTION200-1',
          message: 'PWA 푸시 구독 조회가 완료되었습니다.',
          data: [subscriptionExample],
        },
      },
    }),
  );

export const ApiDeactivatePushSubscription = () =>
  applyDecorators(
    ApiOperation({ summary: 'PWA 푸시 구독 비활성화' }),
    protectedResponses(),
    ApiParam({ name: 'subscriptionId', example: 1 }),
    ApiOkResponse({
      schema: {
        example: {
          success: true,
          code: 'PUSH_SUBSCRIPTION200-2',
          message: 'PWA 푸시 구독이 비활성화되었습니다.',
          data: null,
        },
      },
    }),
    ApiNotFoundResponse({
      schema: {
        example: failResponse(
          'PUSH_SUBSCRIPTION404',
          '푸시 구독을 찾을 수 없습니다.',
        ),
      },
    }),
  );
