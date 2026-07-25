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
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CreateTimelineRequestDto } from './dto/create-timeline-request.dto';
import { UpdateTimelineRequestDto } from './dto/update-timeline-request.dto';

const failResponse = (code: string, message: string) => ({
  success: false,
  code,
  message,
});

const timelineExample = {
  id: 1,
  userId: 1,
  treeId: 1,
  title: '오아시스 만난 곳',
  content: '즐겁게 산책했다.',
  category: 'VISIT',
  visitedAt: '2026-07-16T09:30:00.000Z',
  createdAt: '2026-07-16T10:00:00.000Z',
  updatedAt: '2026-07-16T10:00:00.000Z',
  tree: {
    id: 1,
    name: '오아시스 만난 곳',
    mood: 'HAPPY',
    defaultImage: 'https://example.com/default-tree.png',
  },
};

const successResponse = (data: unknown, created = false) => ({
  success: true,
  code: created ? 'COMMON201' : 'COMMON200',
  message: created ? '생성되었습니다.' : '요청이 성공했습니다.',
  data,
});

const protectedResponses = () =>
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

const notFoundResponses = () =>
  applyDecorators(
    ApiNotFoundResponse({
      description: '타임라인 또는 나무를 찾을 수 없음',
      schema: {
        examples: {
          timeline: {
            value: failResponse('TIMELINE404', '타임라인을 찾을 수 없습니다.'),
          },
          tree: {
            value: failResponse('TREE404', '나무를 찾을 수 없습니다.'),
          },
        },
      },
    }),
  );

export const ApiGetTimelines = () =>
  applyDecorators(
    ApiOperation({ summary: '타임라인 목록 조회' }),
    protectedResponses(),
    ApiOkResponse({
      description: '타임라인 목록 조회 성공',
      schema: {
        example: successResponse({
          items: [timelineExample],
          page: 1,
          size: 20,
          totalElements: 1,
          totalPages: 1,
          hasNext: false,
        }),
      },
    }),
  );

export const ApiGetTimeline = () =>
  applyDecorators(
    ApiOperation({ summary: '타임라인 상세 조회' }),
    protectedResponses(),
    notFoundResponses(),
    ApiOkResponse({
      description: '타임라인 상세 조회 성공',
      schema: { example: successResponse(timelineExample) },
    }),
  );

export const ApiCreateTimeline = () =>
  applyDecorators(
    ApiOperation({ summary: '타임라인 기록 생성' }),
    protectedResponses(),
    notFoundResponses(),
    ApiBody({ type: CreateTimelineRequestDto }),
    ApiCreatedResponse({
      description: '타임라인 생성 성공',
      schema: { example: successResponse(timelineExample, true) },
    }),
    ApiBadRequestResponse({
      description: '요청값 검증 실패',
      schema: { example: failResponse('COMMON400', '잘못된 요청입니다.') },
    }),
  );

export const ApiUpdateTimeline = () =>
  applyDecorators(
    ApiOperation({ summary: '타임라인 기록 수정' }),
    protectedResponses(),
    notFoundResponses(),
    ApiBody({ type: UpdateTimelineRequestDto }),
    ApiOkResponse({
      description: '타임라인 수정 성공',
      schema: { example: successResponse(timelineExample) },
    }),
    ApiBadRequestResponse({
      description: '요청값 검증 실패 또는 수정할 값 없음',
      schema: {
        example: failResponse(
          'TIMELINE400',
          '타임라인 수정 요청 값이 올바르지 않습니다.',
        ),
      },
    }),
  );

export const ApiDeleteTimeline = () =>
  applyDecorators(
    ApiOperation({ summary: '타임라인 기록 삭제' }),
    protectedResponses(),
    notFoundResponses(),
    ApiOkResponse({
      description: '타임라인 삭제 성공',
      schema: { example: successResponse(null) },
    }),
  );
