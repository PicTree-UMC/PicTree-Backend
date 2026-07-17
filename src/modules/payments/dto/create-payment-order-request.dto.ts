import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class CreatePaymentOrderRequestDto {
  @ApiProperty({ example: 2, description: '결제할 구독 요금제 ID' })
  @IsInt()
  @Min(1)
  subscriptionPlanId!: number;
}
