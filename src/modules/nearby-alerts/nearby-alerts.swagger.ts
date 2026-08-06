import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CheckNearbyAlertRequestDto } from './dto/check-nearby-alert-request.dto';

const failResponse = (code: string, message: string) => ({
  success: false,
  code,
  message,
});

const alertLogExample = {
  alertLogId: 1,
  treeId: 3,
  treeName: '우리 동네 벚나무',
  defaultImage: 'DEFAULT_1',
  distanceM: 42,
  status: 'SENT',
  sentAt: '2026-07-25T05:30:00.000Z',
  openedAt: null,
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

export const ApiCheckNearbyAlerts = () =>
  applyDecorators(
    ApiOperation({
      summary: '근처 나무 알림 체크',
      description:
        '현재 위치를 기준으로 반경 100m 이내의 나무를 확인하고 알림을 전송합니다.',
    }),
    protectedResponses(),
    ApiBody({ type: CheckNearbyAlertRequestDto }),
    ApiOkResponse({
      schema: {
        example: {
          success: true,
          code: 'COMMON200',
          message: '요청이 성공했습니다.',
          data: { nearbyCount: 2, sentCount: 1 },
        },
      },
    }),
    ApiBadRequestResponse({
      schema: { example: failResponse('COMMON400', '잘못된 요청입니다.') },
    }),
  );

export const ApiGetNearbyAlertLogs = () =>
  applyDecorators(
    ApiOperation({ summary: '근처 나무 알림 기록 조회' }),
    protectedResponses(),
    ApiOkResponse({
      description: '알림 기록 목록 조회 성공',
      schema: {
        example: {
          success: true,
          code: 'COMMON200',
          message: '요청이 성공했습니다.',
          data: {
            items: [alertLogExample],
            page: 1,
            size: 20,
            totalElements: 1,
            totalPages: 1,
            hasNext: false,
          },
        },
      },
    }),
  );

export const ApiOpenNearbyAlertLog = () =>
  applyDecorators(
    ApiOperation({ summary: '근처 나무 알림 확인 처리' }),
    protectedResponses(),
    ApiParam({ name: 'alertLogId', example: 1 }),
    ApiOkResponse({
      description: '알림 확인 처리 성공',
      schema: {
        example: {
          success: true,
          code: 'COMMON200',
          message: '요청이 성공했습니다.',
          data: {
            ...alertLogExample,
            status: 'OPENED',
            openedAt: '2026-07-25T05:31:00.000Z',
          },
        },
      },
    }),
    ApiNotFoundResponse({
      schema: {
        example: failResponse(
          'NEARBY_ALERT404',
          '근처 나무 알림 기록을 찾을 수 없습니다.',
        ),
      },
    }),
  );

export const ApiDeleteNearbyAlertLog = () =>
  applyDecorators(
    ApiOperation({ summary: '근처 나무 알림 기록 삭제' }),
    protectedResponses(),
    ApiParam({ name: 'alertLogId', example: 1 }),
    ApiOkResponse({
      description: '알림 기록 삭제 성공',
      schema: {
        example: {
          success: true,
          code: 'COMMON200',
          message: '요청이 성공했습니다.',
          data: null,
        },
      },
    }),
    ApiNotFoundResponse({
      schema: {
        example: failResponse(
          'NEARBY_ALERT404',
          '근처 나무 알림 기록을 찾을 수 없습니다.',
        ),
      },
    }),
  );
