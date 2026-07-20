import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BillingKeyResponseDto {
  @ApiProperty({ example: 1, description: '자동결제 수단 ID' })
  billingKeyId!: number;

  @ApiProperty({ example: 'TOSS', description: '결제 제공자' })
  paymentProvider!: string;

  @ApiPropertyOptional({
    example: '11',
    nullable: true,
    description: '카드 발급사 코드',
  })
  cardCompany!: string | null;

  @ApiPropertyOptional({
    example: '433012******1234',
    nullable: true,
    description: '마스킹된 카드 번호',
  })
  cardNumberMasked!: string | null;

  @ApiProperty({ example: 'ACTIVE', description: '결제 수단 상태' })
  status!: string;

  @ApiProperty({
    example: '2026-07-20T10:00:00.000Z',
    description: '빌링키 발급 시간',
  })
  issuedAt!: Date;
}
