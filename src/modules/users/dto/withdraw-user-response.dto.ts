import { ApiProperty } from '@nestjs/swagger';

export class WithdrawUserResponseDto {
  @ApiProperty({
    example: '2026-09-07T10:00:00.000Z',
    description: '계정 복구 가능 기한',
  })
  recoverableUntil!: Date;
}
