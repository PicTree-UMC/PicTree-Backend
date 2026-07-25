import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CheckNearbyAlertRequestDto } from './check-nearby-alert-request.dto';

describe('CheckNearbyAlertRequestDto', () => {
  it.each([
    ['latitude', '', 127],
    ['latitude', 'not-a-number', 127],
    ['longitude', 37.5, ''],
    ['longitude', 37.5, 'not-a-number'],
  ])(
    '%s의 빈 값과 숫자가 아닌 값을 거부한다',
    async (property, first, second) => {
      const dto = plainToInstance(CheckNearbyAlertRequestDto, {
        latitude: first,
        longitude: second,
      });

      const errors = await validate(dto);

      expect(errors.some((error) => error.property === property)).toBe(true);
    },
  );
});
