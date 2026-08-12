import { ApiProperty } from '@nestjs/swagger';

export class SubscriptionPlanSummaryDto {
  @ApiProperty({ example: 2, description: '요금제 ID' })
  id!: number;

  @ApiProperty({ example: 'PLUS', description: '요금제 코드' })
  code!: string;

  @ApiProperty({ example: '플러스', description: '요금제명' })
  name!: string;

  @ApiProperty({ example: 2900, description: '결제 금액' })
  price!: number;

  @ApiProperty({ example: 'MONTHLY', description: '결제 주기' })
  billingCycle!: string;
}

export class PendingPlanChangeDto {
  @ApiProperty({ type: SubscriptionPlanSummaryDto })
  plan!: SubscriptionPlanSummaryDto;

  @ApiProperty({
    example: '2026-08-21T10:00:00.000Z',
    description: '변경 플랜 적용 및 결제 예정일',
  })
  effectiveAt!: Date;

  @ApiProperty({
    example: '2026-08-08T10:00:00.000Z',
    description: '플랜 변경 요청일',
  })
  requestedAt!: Date;
}

export class SubscriptionResponseDto {
  @ApiProperty({
    example: 1,
    nullable: true,
    description: '사용자 구독 ID. 무료 이용자는 null',
  })
  subscriptionId!: number | null;

  @ApiProperty({ example: 'ACTIVE', description: '구독 상태' })
  status!: string;

  @ApiProperty({ type: SubscriptionPlanSummaryDto })
  plan!: SubscriptionPlanSummaryDto;

  @ApiProperty({
    example: '2026-07-21T10:00:00.000Z',
    nullable: true,
    description: '구독 시작일',
  })
  startedAt!: Date | null;

  @ApiProperty({
    example: '2026-08-21T10:00:00.000Z',
    nullable: true,
    description: '현재 구독 기간 만료일',
  })
  expiresAt!: Date | null;

  @ApiProperty({ example: true, description: '자동갱신 여부' })
  autoRenew!: boolean;

  @ApiProperty({
    example: '2026-08-21T10:00:00.000Z',
    nullable: true,
    description: '다음 결제 예정일',
  })
  nextBillingAt!: Date | null;

  @ApiProperty({
    type: PendingPlanChangeDto,
    nullable: true,
    description: '예약된 플랜 변경. 예약이 없으면 null',
  })
  pendingPlanChange!: PendingPlanChangeDto | null;
}
