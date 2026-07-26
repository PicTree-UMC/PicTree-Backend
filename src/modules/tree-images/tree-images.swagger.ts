import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiPayloadTooLargeResponse,
  ApiQuery,
  ApiUnauthorizedResponse,
  ApiUnsupportedMediaTypeResponse,
} from '@nestjs/swagger';

const failResponse = (code: string, message: string) => ({
  success: false,
  code,
  message,
});

const imageExample = {
  imageId: 10,
  imageUrl: 'https://pictree-images-prod.s3.ap-northeast-2.amazonaws.com/...',
  timelineRecordId: null,
  fileSize: 204800,
  sortOrder: 0,
};

const protectedResponses = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiUnauthorizedResponse({
      description: 'Access Token 없음 또는 유효하지 않음',
      schema: {
        example: failResponse('AUTH401', '유효하지 않은 Access Token입니다.'),
      },
    }),
    ApiForbiddenResponse({
      description: '타인의 나무 접근',
      schema: { example: failResponse('TREE403', '접근 권한이 없습니다.') },
    }),
    ApiNotFoundResponse({
      description: '존재하지 않는 나무',
      schema: {
        example: failResponse('TREE404', '존재하지 않는 나무입니다.'),
      },
    }),
    ApiInternalServerErrorResponse({
      description: '서버 내부 오류',
      schema: { example: failResponse('COMMON500', '서버 내부 오류입니다.') },
    }),
  );

const treeIdParam = () =>
  ApiParam({ name: 'treeId', example: 1, description: '나무 ID' });

export const ApiUploadTreeImages = () =>
  applyDecorators(
    ApiOperation({ summary: '나무 사진 업로드' }),
    protectedResponses(),
    treeIdParam(),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          images: {
            type: 'array',
            items: { type: 'string', format: 'binary' },
            description: '업로드할 사진 파일 (복수 가능)',
          },
          timelineRecordId: {
            type: 'number',
            description: '특정 타임라인 기록의 사진일 때만',
          },
        },
        required: ['images'],
      },
    }),
    ApiCreatedResponse({
      description: '사진 업로드 성공',
      schema: {
        example: {
          success: true,
          code: 'COMMON201',
          message: '생성되었습니다.',
          data: { images: [imageExample] },
        },
      },
    }),
    ApiBadRequestResponse({
      description: '파일 없음',
      schema: {
        example: failResponse(
          'TREE_IMAGE400',
          '업로드할 이미지 파일이 없습니다.',
        ),
      },
    }),
    ApiPayloadTooLargeResponse({
      description: '파일 크기 초과 (10MB)',
      schema: { example: failResponse('COMMON400', '잘못된 요청입니다.') },
    }),
    ApiUnsupportedMediaTypeResponse({
      description: '지원하지 않는 이미지 형식',
      schema: {
        example: failResponse(
          'TREE_IMAGE415',
          '지원하지 않는 이미지 형식입니다.',
        ),
      },
    }),
  );

export const ApiGetTreeImages = () =>
  applyDecorators(
    ApiOperation({ summary: '나무 사진 목록 조회' }),
    protectedResponses(),
    treeIdParam(),
    ApiQuery({
      name: 'timelineRecordId',
      required: false,
      type: Number,
      description: '특정 타임라인 기록의 사진만 필터 (생략 시 전체)',
    }),
    ApiOkResponse({
      description: '사진 목록 조회 성공',
      schema: {
        example: {
          success: true,
          code: 'COMMON200',
          message: '요청이 성공했습니다.',
          data: { images: [imageExample] },
        },
      },
    }),
  );

export const ApiDeleteTreeImage = () =>
  applyDecorators(
    ApiOperation({ summary: '나무 사진 삭제' }),
    protectedResponses(),
    treeIdParam(),
    ApiParam({ name: 'imageId', example: 10, description: '사진 ID' }),
    ApiOkResponse({
      description: '사진 삭제 성공',
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
      description: '존재하지 않는 나무 또는 사진',
      schema: {
        example: failResponse('TREE_IMAGE404', '존재하지 않는 사진입니다.'),
      },
    }),
  );
