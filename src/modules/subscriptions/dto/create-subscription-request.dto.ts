import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class CreateSubscriptionRequestDto {
  @ApiProperty({ example: 2, description: '구독할 요금제 ID' })
  @IsInt()
  @IsPositive()
  subscriptionPlanId!: number;

  @ApiProperty({ example: 1, description: '사용할 자동결제 수단 ID' })
  @IsInt()
  @IsPositive()
  billingKeyId!: number;
}
