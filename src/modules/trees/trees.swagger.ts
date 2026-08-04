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
import { CreateTreeRequestDto } from './dto/create-tree-request.dto';
import { UpdateTreeRequestDto } from './dto/update-tree-request.dto';

const failResponse = (code: string, message: string) => ({
  success: false,
  code,
  message,
});

const protectedTreeResponses = () =>
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

const treeResourceResponses = () =>
  applyDecorators(
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
  );

const treeIdParam = () =>
  ApiParam({ name: 'treeId', example: 1, description: '나무 ID' });

export const ApiCreateTree = () =>
  applyDecorators(
    ApiOperation({ summary: '나무 등록' }),
    protectedTreeResponses(),
    ApiBody({ type: CreateTreeRequestDto }),
    ApiCreatedResponse({
      description: '나무 등록 성공',
      schema: {
        example: {
          success: true,
          code: 'COMMON201',
          message: '생성되었습니다.',
          data: { treeId: 1, adRequired: true },
        },
      },
    }),
    ApiBadRequestResponse({
      description: '요청 값 오류',
      schema: { example: failResponse('COMMON400', '잘못된 요청입니다.') },
    }),
  );

export const ApiGetMyTrees = () =>
  applyDecorators(
    ApiOperation({ summary: '내 나무 목록 조회 (지도)' }),
    protectedTreeResponses(),
    ApiOkResponse({
      description: '나무 목록 조회 성공',
      schema: {
        example: {
          success: true,
          code: 'COMMON200',
          message: '요청이 성공했습니다.',
          data: {
            items: [
              {
                treeId: 1,
                name: '우리 동네 벚나무',
                description: '산책로 입구에 있는 나무',
                latitude: 37.5665,
                longitude: 126.978,
                mood: '😍',
                defaultImage: 'DEFAULT_1',
                imageUrl: 'https://.../a.jpg?X-Amz-Signature=...',
                isFavorite: false,
                createdAt: '2026-07-19T10:00:00.000Z',
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

export const ApiGetFavoriteTrees = () =>
  applyDecorators(
    ApiOperation({ summary: '즐겨찾기 장소 목록 조회' }),
    protectedTreeResponses(),
    ApiOkResponse({
      description: '즐겨찾기 장소 조회 성공',
      schema: {
        example: {
          success: true,
          code: 'FAVORITE200-1',
          message: '즐겨찾기 장소 조회가 완료되었습니다.',
          data: {
            count: 2,
            favorites: [
              {
                treeId: 1,
                name: '오아시스 만난 곳',
                description: '길 가다가 오아시스 자만추',
                visitedAt: '2026-03-30',
                imageUrl: 'https://.../a.jpg',
              },
            ],
          },
        },
      },
    }),
  );

export const ApiGetTree = () =>
  applyDecorators(
    ApiOperation({ summary: '나무 상세 조회' }),
    protectedTreeResponses(),
    treeIdParam(),
    treeResourceResponses(),
    ApiOkResponse({
      description: '나무 상세 조회 성공',
      schema: {
        example: {
          success: true,
          code: 'COMMON200',
          message: '요청이 성공했습니다.',
          data: {
            treeId: 1,
            name: '우리 동네 벚나무',
            description: '산책로 입구',
            latitude: 37.5665,
            longitude: 126.978,
            address: '서울시 중구 ...',
            mood: '😍',
            defaultImage: 'DEFAULT_1',
            isFavorite: false,
            images: [
              {
                imageId: 10,
                imageUrl: 'https://.../a.jpg?X-Amz-Signature=...',
                timelineRecordId: null,
              },
            ],
            createdAt: '2026-07-19T10:00:00.000Z',
            updatedAt: '2026-07-19T10:10:00.000Z',
          },
        },
      },
    }),
  );

export const ApiGetNearbyTrees = () =>
  applyDecorators(
    ApiOperation({
      summary: '근처 나무 조회',
      description: '현재 위치를 기준으로 반경 100m 이내의 나무를 조회합니다.',
    }),
    protectedTreeResponses(),
    ApiOkResponse({
      description: '거리순 근처 나무 조회 성공',
      schema: {
        example: {
          success: true,
          code: 'COMMON200',
          message: '요청이 성공했습니다.',
          data: [
            {
              treeId: 1,
              name: '우리 동네 벚나무',
              latitude: 37.5665,
              longitude: 126.978,
              mood: 'HAPPY',
              defaultImage: 'DEFAULT_1',
              distanceM: 42,
            },
          ],
        },
      },
    }),
    ApiBadRequestResponse({
      description: '위치 또는 반경 요청 값 오류',
      schema: { example: failResponse('COMMON400', '잘못된 요청입니다.') },
    }),
  );

export const ApiUpdateTree = () =>
  applyDecorators(
    ApiOperation({ summary: '나무 정보 수정' }),
    protectedTreeResponses(),
    treeIdParam(),
    treeResourceResponses(),
    ApiBody({ type: UpdateTreeRequestDto }),
    ApiOkResponse({
      description: '나무 정보 수정 성공',
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
        example: failResponse('TREE400', '나무 요청 값이 올바르지 않습니다.'),
      },
    }),
  );

export const ApiToggleFavoriteTree = () =>
  applyDecorators(
    ApiOperation({ summary: '즐겨찾기 장소 추가/삭제' }),
    protectedTreeResponses(),
    treeIdParam(),
    treeResourceResponses(),
    ApiOkResponse({
      description: '즐겨찾기 상태 변경 성공',
      schema: {
        example: {
          success: true,
          code: 'FAVORITE200-2',
          message: '즐겨찾기 상태가 변경되었습니다.',
          data: {
            treeId: 1,
            isFavorite: true,
          },
        },
      },
    }),
  );

export const ApiDeleteTree = () =>
  applyDecorators(
    ApiOperation({
      summary: '나무 삭제',
      description:
        '나무를 삭제하면 해당 나무의 사진 레코드가 함께 삭제되고 S3 객체 삭제도 시도합니다. S3 삭제가 실패해도 나무 삭제는 진행되므로 S3 객체가 남을 수 있습니다. 타임라인 기록 자체는 유지됩니다.',
    }),
    protectedTreeResponses(),
    treeIdParam(),
    treeResourceResponses(),
    ApiOkResponse({
      description: '나무 삭제 성공',
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
