import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class ChangeSubscriptionPlanRequestDto {
  @ApiProperty({ example: 3, description: '변경할 요금제 ID' })
  @IsInt()
  @IsPositive()
  subscriptionPlanId!: number;
}
