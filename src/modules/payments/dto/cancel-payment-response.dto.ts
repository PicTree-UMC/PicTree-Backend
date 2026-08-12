import { ApiProperty } from '@nestjs/swagger';

export class CancelPaymentResponseDto {
  @ApiProperty({ example: 1, description: '결제 ID' })
  paymentId!: number;

  @ApiProperty({
    example: 'ORDER_1_lzk6q9x7_a1b2c3d4',
    description: '주문 ID',
  })
  orderId!: string;

  @ApiProperty({ example: 2900, description: '취소 금액' })
  amount!: number;

  @ApiProperty({ example: 'CANCELED', description: '결제 상태' })
  status!: string;

  @ApiProperty({
    example: '2026-07-20T10:00:00.000Z',
    description: '결제 취소 시간',
  })
  canceledAt!: Date;
}
