import { applyDecorators } from '@nestjs/common';
import {
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';

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
          code: 'COMMON200',
          message: '요청이 성공했습니다.',
          data: [
            {
              id: 1,
              title: '서비스 이용약관',
              type: 'SERVICE',
              version: '1.0',
              contentUrl: 'https://example.com/terms/service-v1.html',
              isRequired: true,
              effectiveFrom: '2026-07-16T00:00:00.000Z',
            },
            {
              id: 2,
              title: '마케팅 정보 수신 동의',
              type: 'MARKETING',
              version: '1.0',
              contentUrl: null,
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
