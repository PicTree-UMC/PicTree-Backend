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

export const ApiGetSubscriptionPlans = () =>
  applyDecorators(
    ApiOperation({ summary: '구독 요금제 목록 조회' }),
    ApiOkResponse({
      description: '구독 요금제 목록 조회 성공',
      schema: {
        example: {
          success: true,
          code: 'COMMON200',
          message: '요청이 성공했습니다.',
          data: [
            {
              id: 1,
              code: 'FREE',
              name: '무료',
              price: 0,
              billingCycle: 'NONE',
              description: '기본 무료 플랜',
              features: [
                {
                  code: 'PHOTO_STORAGE',
                  name: '사진 저장 용량',
                  description: '요금제별 사진 저장 가능 용량',
                  valueType: 'LIMIT',
                  unit: 'MB',
                  isEnabled: true,
                  limitValue: 100,
                  textValue: null,
                },
              ],
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
