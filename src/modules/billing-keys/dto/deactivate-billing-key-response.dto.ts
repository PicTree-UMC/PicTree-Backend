import { ApiProperty } from '@nestjs/swagger';

export class DeactivateBillingKeyResponseDto {
  @ApiProperty({ example: 1, description: '자동결제 수단 ID' })
  billingKeyId!: number;

  @ApiProperty({ example: 'DEACTIVATED', description: '결제 수단 상태' })
  status!: string;

  @ApiProperty({
    example: '2026-07-20T11:00:00.000Z',
    description: '빌링키 비활성화 시간',
  })
  deactivatedAt!: Date;
}
