import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionPlanFeatureResponseDto } from './subscription-plan-feature-response.dto';

export class SubscriptionPlanResponseDto {
  @ApiProperty({ example: 1, description: '구독 요금제 ID' })
  id!: number;

  @ApiProperty({ example: 'PLUS', description: '구독 요금제 코드' })
  code!: string;

  @ApiProperty({ example: '플러스', description: '구독 요금제명' })
  name!: string;

  @ApiProperty({ example: 2900, description: '가격' })
  price!: number;

  @ApiProperty({ example: 'MONTHLY', description: '결제 주기' })
  billingCycle!: string;

  @ApiProperty({
    example: '가볍게 여행 기록을 남기는 사용자를 위한 플랜',
    nullable: true,
    description: '요금제 설명',
  })
  description!: string | null;

  @ApiProperty({
    type: [SubscriptionPlanFeatureResponseDto],
    description: '요금제 제공 기능 목록',
  })
  features!: SubscriptionPlanFeatureResponseDto[];
}
