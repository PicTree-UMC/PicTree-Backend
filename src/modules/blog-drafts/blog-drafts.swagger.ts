import { applyDecorators } from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiParam,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { GenerateBlogDraftRequestDto } from './dto/generate-blog-draft-request.dto';
import { SaveBlogDraftRequestDto } from './dto/save-blog-draft-request.dto';

const failResponse = (code: string, message: string) => ({
  success: false,
  code,
  message,
});

const jsonExamples = (
  examples: Record<string, { summary: string; value: unknown }>,
) => ({
  'application/json': {
    examples,
  },
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

const draftIdParam = () =>
  ApiParam({ name: 'draftId', example: 1, description: '초안 ID' });

export const ApiGetBlogDrafts = () =>
  applyDecorators(
    ApiOperation({ summary: 'AI 블로그 초안 목록 조회' }),
    protectedResponses(),
    ApiOkResponse({
      description: '초안 목록 조회 성공',
      schema: {
        example: {
          success: true,
          code: 'BLOG200-1',
          message: 'AI 블로그 초안 목록 조회가 완료되었습니다.',
          data: {
            drafts: [
              {
                draftId: 1,
                title: '[여행 기록] 3월 31일 ~ 4월 1일',
                thumbnailUrl: 'https://.../a.jpg?X-Amz-Signature=...',
                startDate: '2026-03-31',
                endDate: '2026-04-01',
                createdAt: '2026-04-01T12:00:00',
              },
            ],
          },
        },
      },
    }),
  );

export const ApiGenerateBlogDraft = () =>
  applyDecorators(
    ApiOperation({ summary: 'AI 블로그 초안 생성' }),
    protectedResponses(),
    ApiBody({ type: GenerateBlogDraftRequestDto }),
    ApiOkResponse({
      description: '초안 생성 성공',
      schema: {
        example: {
          success: true,
          code: 'BLOG200-2',
          message: 'AI 블로그 초안 생성이 완료되었습니다.',
          data: {
            title: '[여행 기록] 3월 31일 ~ 4월 1일',
            days: [
              {
                date: '2026-03-31',
                items: [
                  {
                    treeId: 1,
                    imageUrl: 'https://.../a.jpg?X-Amz-Signature=...',
                    placeName: '포그레인 공원',
                    content:
                      '해 질 무렵 공원을 걸었음. 조용해서 산책하기 좋았음.',
                  },
                  {
                    treeId: 2,
                    imageUrl: null,
                    placeName: '피자 맛집',
                    content: '저녁으로 피자를 먹었음. 기다린 만큼 맛있었음.',
                  },
                ],
              },
              {
                date: '2026-04-01',
                items: [
                  {
                    treeId: 3,
                    imageUrl: null,
                    placeName: '마트',
                    content: '필요한 걸 사러 들렀음. 생각보다 오래 구경했음.',
                  },
                ],
              },
            ],
            startDate: '2026-03-31',
            endDate: '2026-04-01',
          },
        },
      },
    }),
    ApiBadRequestResponse({
      description: '요청 값 오류 또는 생성 데이터 없음',
      content: jsonExamples({
        invalid: {
          summary: '요청 값 오류',
          value: failResponse(
            'BLOG400-1',
            'AI 블로그 초안 요청 값이 올바르지 않습니다.',
          ),
        },
        empty: {
          summary: '생성 데이터 없음',
          value: failResponse(
            'BLOG400-2',
            '선택한 기간에 블로그 초안을 생성할 데이터가 없습니다.',
          ),
        },
      }),
    }),
    ApiForbiddenResponse({
      description: '이용 기간 내 생성 한도 초과',
      schema: {
        example: failResponse(
          'BLOG403',
          '이번 이용 기간의 AI 블로그 초안 생성 가능 횟수를 모두 사용했습니다.',
        ),
      },
    }),
    ApiNotFoundResponse({
      description: '존재하지 않는 나무 포함',
      schema: {
        example: failResponse('TREE404', '존재하지 않는 나무입니다.'),
      },
    }),
    ApiBadGatewayResponse({
      description: 'OpenAI 초안 생성 실패',
      schema: {
        example: failResponse('BLOG502', 'AI 블로그 초안 생성에 실패했습니다.'),
      },
    }),
  );

export const ApiSaveBlogDraft = () =>
  applyDecorators(
    ApiOperation({ summary: 'AI 블로그 초안 저장' }),
    protectedResponses(),
    ApiBody({ type: SaveBlogDraftRequestDto }),
    ApiCreatedResponse({
      description: '초안 저장 성공',
      schema: {
        example: {
          success: true,
          code: 'BLOG201',
          message: 'AI 블로그 초안이 저장되었습니다.',
          data: {
            draftId: 1,
          },
        },
      },
    }),
    ApiNotFoundResponse({
      description: '존재하지 않는 나무',
      schema: {
        example: failResponse('TREE404', '존재하지 않는 나무입니다.'),
      },
    }),
    ApiBadRequestResponse({
      description: '요청 값 오류',
      content: jsonExamples({
        invalid: {
          summary: '요청 값 오류',
          value: failResponse(
            'BLOG400-1',
            'AI 블로그 초안 요청 값이 올바르지 않습니다.',
          ),
        },
        empty: {
          summary: '저장할 내용 없음',
          value: failResponse(
            'BLOG400-3',
            '저장할 AI 블로그 초안 내용이 없습니다.',
          ),
        },
      }),
    }),
  );

export const ApiGetBlogDraft = () =>
  applyDecorators(
    ApiOperation({ summary: 'AI 블로그 초안 상세 조회' }),
    protectedResponses(),
    draftIdParam(),
    ApiOkResponse({
      description: '초안 상세 조회 성공',
      schema: {
        example: {
          success: true,
          code: 'BLOG200-2',
          message: 'AI 블로그 초안 상세 조회가 완료되었습니다.',
          data: {
            draftId: 1,
            title: '[여행 기록] 3월 31일 ~ 4월 1일',
            days: [
              {
                date: '2026-03-31',
                items: [
                  {
                    treeId: 1,
                    imageUrl: 'https://.../a.jpg?X-Amz-Signature=...',
                    placeName: '포그레인 공원',
                    content:
                      '해 질 무렵 공원을 걸었음. 조용해서 산책하기 좋았음.',
                  },
                  {
                    treeId: 2,
                    imageUrl: null,
                    placeName: '피자 맛집',
                    content: '저녁으로 피자를 먹었음. 기다린 만큼 맛있었음.',
                  },
                ],
              },
              {
                date: '2026-04-01',
                items: [
                  {
                    treeId: 3,
                    imageUrl: null,
                    placeName: '마트',
                    content: '필요한 걸 사러 들렀음. 생각보다 오래 구경했음.',
                  },
                ],
              },
            ],
            startDate: '2026-03-31',
            endDate: '2026-04-01',
            createdAt: '2026-04-01T12:00:00',
          },
        },
      },
    }),
    ApiNotFoundResponse({
      description: '존재하지 않는 초안',
      schema: {
        example: failResponse('BLOG404', 'AI 블로그 초안을 찾을 수 없습니다.'),
      },
    }),
  );

export const ApiDeleteBlogDraft = () =>
  applyDecorators(
    ApiOperation({ summary: 'AI 블로그 초안 삭제' }),
    protectedResponses(),
    draftIdParam(),
    ApiOkResponse({
      description: '초안 삭제 성공',
      schema: {
        example: {
          success: true,
          code: 'BLOG200-3',
          message: 'AI 블로그 초안이 삭제되었습니다.',
          data: null,
        },
      },
    }),
    ApiNotFoundResponse({
      description: '존재하지 않는 초안',
      schema: {
        example: failResponse('BLOG404', 'AI 블로그 초안을 찾을 수 없습니다.'),
      },
    }),
  );
