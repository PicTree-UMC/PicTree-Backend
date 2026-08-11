import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

const failResponse = (code: string, message: string) => ({
  success: false,
  code,
  message,
});

export const ApiGetCalendar = () =>
  applyDecorators(
    ApiOperation({ summary: '여행 캘린더 조회' }),
    ApiBearerAuth(),
    ApiOkResponse({
      description: '여행 캘린더 조회 성공',
      schema: {
        example: {
          success: true,
          code: 'CALENDAR200',
          message: '여행 캘린더 조회가 완료되었습니다.',
          data: {
            year: 2026,
            month: 4,
            days: [
              { date: '2026-04-01', count: 4, level: 3 },
              { date: '2026-04-02', count: 0, level: 0 },
            ],
          },
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'year 또는 month 요청값 오류',
      schema: {
        example: failResponse('COMMON400', '잘못된 요청입니다.'),
      },
    }),
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
