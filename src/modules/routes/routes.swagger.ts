import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CreateRouteRequestDto } from './dto/create-route-request.dto';
import { UpdateRouteRequestDto } from './dto/update-route-request.dto';

const failResponse = (code: string, message: string) => ({
  success: false,
  code,
  message,
});

const protectedRouteResponses = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiUnauthorizedResponse({
      description: 'Access Token 없음 또는 유효하지 않음',
      schema: {
        example: failResponse('AUTH401', '유효하지 않은 Access Token입니다.'),
      },
    }),
    ApiInternalServerErrorResponse({
      description: '서버 내부 오류',
      schema: {
        example: failResponse('COMMON500', '서버 내부 오류입니다.'),
      },
    }),
  );

const routeResourceResponses = () =>
  applyDecorators(
    ApiForbiddenResponse({
      description: '타인의 동선 접근',
      schema: { example: failResponse('ROUTE403', '접근 권한이 없습니다.') },
    }),
    ApiNotFoundResponse({
      description: '존재하지 않는 동선',
      schema: {
        example: failResponse('ROUTE404', '존재하지 않는 동선입니다.'),
      },
    }),
  );

const routeIdParam = () =>
  ApiParam({ name: 'routeId', example: 1, description: '동선 ID' });

export const ApiCreateRoute = () =>
  applyDecorators(
    ApiOperation({ summary: '동선 기록 생성' }),
    protectedRouteResponses(),
    ApiBody({ type: CreateRouteRequestDto }),
    ApiCreatedResponse({
      description: '동선 저장 성공',
      schema: {
        example: {
          success: true,
          code: 'COMMON201',
          message: '생성되었습니다.',
          data: { routeId: 1 },
        },
      },
    }),
    ApiBadRequestResponse({
      description: '요청 값 오류 (좌표 누락 등)',
      schema: { example: failResponse('COMMON400', '잘못된 요청입니다.') },
    }),
  );

export const ApiGetMyRoutes = () =>
  applyDecorators(
    ApiOperation({ summary: '내 동선 목록 조회' }),
    protectedRouteResponses(),
    ApiOkResponse({
      description: '동선 목록 조회 성공',
      schema: {
        example: {
          success: true,
          code: 'COMMON200',
          message: '요청이 성공했습니다.',
          data: {
            items: [
              {
                routeId: 1,
                routeName: '아침 산책',
                totalDistanceM: 1200,
                startedAt: '2026-07-19T07:00:00.000Z',
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
  );

export const ApiGetRoute = () =>
  applyDecorators(
    ApiOperation({ summary: '동선 상세 조회' }),
    protectedRouteResponses(),
    routeIdParam(),
    routeResourceResponses(),
    ApiOkResponse({
      description: '동선 상세 조회 성공',
      schema: {
        example: {
          success: true,
          code: 'COMMON200',
          message: '요청이 성공했습니다.',
          data: {
            routeId: 1,
            routeName: '아침 산책',
            totalDistanceM: 1200,
            startedAt: '2026-07-19T07:00:00.000Z',
            endedAt: '2026-07-19T07:30:00.000Z',
            points: [{ latitude: 37.5665, longitude: 126.978, sequence: 0 }],
          },
        },
      },
    }),
  );

export const ApiUpdateRoute = () =>
  applyDecorators(
    ApiOperation({ summary: '동선 이름 수정' }),
    protectedRouteResponses(),
    routeIdParam(),
    routeResourceResponses(),
    ApiBody({ type: UpdateRouteRequestDto }),
    ApiOkResponse({
      description: '동선 수정 성공',
      schema: {
        example: {
          success: true,
          code: 'COMMON200',
          message: '요청이 성공했습니다.',
          data: null,
        },
      },
    }),
    ApiBadRequestResponse({
      description: '수정 요청 값 오류 또는 수정할 값 없음',
      schema: {
        example: failResponse('ROUTE400', '동선 요청 값이 올바르지 않습니다.'),
      },
    }),
  );

export const ApiDeleteRoute = () =>
  applyDecorators(
    ApiOperation({ summary: '동선 삭제' }),
    protectedRouteResponses(),
    routeIdParam(),
    routeResourceResponses(),
    ApiOkResponse({
      description: '동선 삭제 성공 (좌표도 함께 삭제)',
      schema: {
        example: {
          success: true,
          code: 'COMMON200',
          message: '요청이 성공했습니다.',
          data: null,
        },
      },
    }),
  );
