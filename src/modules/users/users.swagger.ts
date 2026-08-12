import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SuccessCode } from '../../common/responses/success-code';
import { UpdateUserRequestDto } from './dto/update-user-request.dto';

const failResponse = (code: string, message: string) => ({
  success: false,
  code,
  message,
});

const userDataExample = {
  id: 1,
  email: 'user@example.com',
  nickname: '승범',
  profileImageUrl: 'https://example.com/profile.jpg',
  role: 'USER',
  status: 'ACTIVE',
  currentPlan: 'FREE',
  notification: true,
  createdAt: '2026-07-14T10:00:00.000Z',
  updatedAt: '2026-07-14T10:10:00.000Z',
};

const protectedUserResponses = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiUnauthorizedResponse({
      description: 'Access Token 없음 또는 유효하지 않음',
      schema: {
        example: failResponse('AUTH401', '유효하지 않은 Access Token입니다.'),
      },
    }),
    ApiForbiddenResponse({
      description: '이용 불가능한 계정',
      schema: {
        example: failResponse('USER403', '이용할 수 없는 계정입니다.'),
      },
    }),
    ApiNotFoundResponse({
      description: '사용자를 찾을 수 없음',
      schema: {
        example: failResponse('USER404', '사용자를 찾을 수 없습니다.'),
      },
    }),
    ApiInternalServerErrorResponse({
      description: '서버 내부 오류',
      schema: {
        example: failResponse('COMMON500', '서버 내부 오류입니다.'),
      },
    }),
  );

export const ApiGetMe = () =>
  applyDecorators(
    ApiOperation({ summary: '내 정보 조회' }),
    protectedUserResponses(),
    ApiOkResponse({
      description: '내 정보 조회 성공',
      schema: {
        example: {
          success: true,
          code: SuccessCode.USER_RETRIEVED.code,
          message: SuccessCode.USER_RETRIEVED.message,
          data: userDataExample,
        },
      },
    }),
  );

export const ApiUpdateMe = () =>
  applyDecorators(
    ApiOperation({ summary: '내 정보 수정' }),
    protectedUserResponses(),
    ApiBody({ type: UpdateUserRequestDto }),
    ApiOkResponse({
      description: '내 정보 수정 성공',
      schema: {
        example: {
          success: true,
          code: SuccessCode.USER_UPDATED.code,
          message: SuccessCode.USER_UPDATED.message,
          data: userDataExample,
        },
      },
    }),
    ApiBadRequestResponse({
      description: '수정 요청값 오류 또는 수정할 값 없음',
      schema: {
        example: failResponse(
          'USER400',
          '회원 수정 요청 값이 올바르지 않습니다.',
        ),
      },
    }),
  );

export const ApiWithdrawMe = () =>
  applyDecorators(
    ApiOperation({
      summary: '회원 탈퇴',
      description:
        '탈퇴 후 30일 동안 소셜 로그인으로 계정을 복구할 수 있습니다.',
    }),
    protectedUserResponses(),
    ApiOkResponse({
      description: '회원 탈퇴 성공',
      schema: {
        example: {
          success: true,
          code: SuccessCode.USER_WITHDRAWN.code,
          message: SuccessCode.USER_WITHDRAWN.message,
          data: {
            recoverableUntil: '2026-09-07T10:00:00.000Z',
          },
        },
      },
    }),
    ApiConflictResponse({
      description: '이미 탈퇴한 회원',
      schema: {
        example: failResponse('USER409', '이미 탈퇴한 회원입니다.'),
      },
    }),
  );
