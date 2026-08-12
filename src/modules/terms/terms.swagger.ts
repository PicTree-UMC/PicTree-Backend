import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SuccessCode } from '../../common/responses/success-code';
import { AgreeTermsRequestDto } from './dto/agree-terms-request.dto';

const failResponse = (code: string, message: string) => ({
  success: false,
  code,
  message,
});

export const ApiGetTerms = () =>
  applyDecorators(
    ApiOperation({ summary: '약관 목록 조회' }),
    ApiOkResponse({
      description: '약관 목록 조회 성공',
      schema: {
        example: {
          success: true,
          code: SuccessCode.TERMS_RETRIEVED.code,
          message: SuccessCode.TERMS_RETRIEVED.message,
          data: [
            {
              id: 1,
              title: '서비스 이용약관',
              type: 'SERVICE',
              version: '1.0',
              contentUrl: 'https://example.com/terms/service-v1.html',
              summary:
                'PicTree 서비스 이용에 필요한 기본 약관입니다. 회원의 권리·의무, 서비스 제공 범위, 이용 제한 사항 등을 포함합니다.',
              isRequired: true,
              effectiveFrom: '2026-07-16T00:00:00.000Z',
            },
            {
              id: 2,
              title: '마케팅 정보 수신 동의',
              type: 'MARKETING',
              version: '1.0',
              contentUrl: null,
              summary:
                '신규 기능, 이벤트, 혜택 소식을 받습니다. 미동의 시에도 서비스 이용에는 제한이 없습니다.',
              isRequired: false,
              effectiveFrom: '2026-07-16T00:00:00.000Z',
            },
          ],
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

export const ApiAgreeTerms = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: '내 약관 동의 저장' }),
    ApiBody({ type: AgreeTermsRequestDto }),
    ApiOkResponse({
      description: '약관 동의 저장 성공',
      schema: {
        example: {
          success: true,
          code: SuccessCode.TERMS_AGREEMENT_SAVED.code,
          message: SuccessCode.TERMS_AGREEMENT_SAVED.message,
          data: {
            agreedTermIds: [1, 2, 3],
            agreedAt: '2026-07-16T00:00:00.000Z',
          },
        },
      },
    }),
    ApiBadRequestResponse({
      description: '약관 동의 요청값 오류 또는 필수 약관 미동의',
      schema: {
        example: failResponse('TERMS400', '필수 약관에 모두 동의해야 합니다.'),
      },
    }),
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
      description: '사용자 또는 약관을 찾을 수 없음',
      schema: {
        example: failResponse('TERMS404', '약관을 찾을 수 없습니다.'),
      },
    }),
    ApiInternalServerErrorResponse({
      description: '서버 내부 오류',
      schema: {
        example: failResponse('COMMON500', '서버 내부 오류입니다.'),
      },
    }),
  );
