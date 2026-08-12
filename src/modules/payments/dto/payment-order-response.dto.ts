import { ApiProperty } from '@nestjs/swagger';

export class PaymentOrderResponseDto {
  @ApiProperty({ example: 'ORDER_1_lzk6q9x7_a1b2c3d4', description: '주문 ID' })
  orderId!: string;

  @ApiProperty({ example: '플러스 플랜', description: '주문명' })
  orderName!: string;

  @ApiProperty({ example: 2900, description: '결제 금액' })
  amount!: number;

  @ApiProperty({ example: 'USER_1', description: '토스 customerKey' })
  customerKey!: string;
}
