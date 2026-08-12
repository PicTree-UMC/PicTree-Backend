import { ApiProperty } from '@nestjs/swagger';

export class TermsAgreementResponseDto {
  @ApiProperty({
    example: [1, 2, 3],
    description: '동의 저장된 약관 ID 목록',
    type: [Number],
  })
  agreedTermIds!: number[];

  @ApiProperty({
    example: '2026-07-16T00:00:00.000Z',
    description: '동의 저장 시간',
  })
  agreedAt!: Date;
}
