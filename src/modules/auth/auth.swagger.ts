import { applyDecorators } from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthCookie } from './auth.constant';

const failResponse = (code: string, message: string) => ({
  success: false,
  code,
  message,
});

export const ApiSocialLogin = () =>
  applyDecorators(
    ApiOperation({ summary: '소셜 로그인/회원가입' }),
    ApiOkResponse({
      description: '소셜 로그인 성공',
      schema: {
        example: {
          success: true,
          code: 'COMMON200',
          message: '요청이 성공했습니다.',
          data: {
            isNewUser: true,
            needTermsAgreement: true,
            needProfileSetup: false,
            accessToken: '서비스 JWT Access Token',
            expiresIn: 3600,
            user: {
              id: 1,
              email: null,
              nickname: '승범',
              profileImageUrl: 'https://example.com/profile.jpg',
              currentPlan: 'FREE',
            },
          },
        },
      },
    }),
    ApiBadRequestResponse({
      description: '요청값 오류',
      schema: {
        example: failResponse(
          'AUTH400',
          '소셜 로그인 요청 값이 올바르지 않습니다.',
        ),
      },
    }),
    ApiUnauthorizedResponse({
      description: '소셜 인증 실패',
      schema: {
        example: failResponse('AUTH401', '소셜 인증에 실패했습니다.'),
      },
    }),
    ApiForbiddenResponse({
      description: '이용 불가능한 계정',
      schema: {
        example: failResponse('USER403', '이용할 수 없는 계정입니다.'),
      },
    }),
    ApiBadGatewayResponse({
      description: '소셜 제공자 통신 또는 사용자 정보 조회 실패',
      schema: {
        example: failResponse(
          'AUTH502',
          '소셜 로그인 제공자와 통신하는 중 오류가 발생했습니다.',
        ),
      },
    }),
    ApiInternalServerErrorResponse({
      description: '서버 설정 또는 내부 오류',
      schema: {
        example: failResponse('COMMON500', '서버 내부 오류입니다.'),
      },
    }),
  );

export const ApiTokenRefresh = () =>
  applyDecorators(
    ApiOperation({ summary: 'Access Token 재발급' }),
    ApiCookieAuth(AuthCookie.REFRESH_TOKEN),
    ApiOkResponse({
      description: 'Access Token 재발급 성공',
      schema: {
        example: {
          success: true,
          code: 'COMMON200',
          message: '요청이 성공했습니다.',
          data: {
            accessToken: '새로운 서비스 JWT Access Token',
            expiresIn: 3600,
          },
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Refresh Token 없음 또는 유효하지 않음',
      schema: {
        example: failResponse('AUTH401', '유효하지 않은 Refresh Token입니다.'),
      },
    }),
    ApiForbiddenResponse({
      description: '이용 불가능한 계정',
      schema: {
        example: failResponse('USER403', '이용할 수 없는 계정입니다.'),
      },
    }),
    ApiInternalServerErrorResponse({
      description: '서버 설정 또는 내부 오류',
      schema: {
        example: failResponse('COMMON500', '서버 내부 오류입니다.'),
      },
    }),
  );

export const ApiLogout = () =>
  applyDecorators(
    ApiOperation({ summary: '로그아웃' }),
    ApiCookieAuth(AuthCookie.REFRESH_TOKEN),
    ApiOkResponse({
      description: '로그아웃 성공',
      schema: {
        example: {
          success: true,
          code: 'COMMON200',
          message: '요청이 성공했습니다.',
          data: null,
        },
      },
    }),
    ApiInternalServerErrorResponse({
      description: '서버 내부 오류',
      schema: {
        example: failResponse('COMMON500', '서버 내부 오류입니다.'),
      },
    }),
  );
