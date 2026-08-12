import { ApiProperty } from '@nestjs/swagger';

export class PaymentResponseDto {
  @ApiProperty({ example: 1, description: '결제 ID' })
  paymentId!: number;

  @ApiProperty({ example: 'ORDER_1_lzk6q9x7_a1b2c3d4', description: '주문 ID' })
  orderId!: string;

  @ApiProperty({ example: '플러스 플랜', description: '주문명' })
  orderName!: string;

  @ApiProperty({ example: 2900, description: '결제 금액' })
  amount!: number;

  @ApiProperty({ example: 'DONE', description: '결제 상태' })
  status!: string;

  @ApiProperty({ example: '카드', nullable: true, description: '결제 수단' })
  paymentMethod!: string | null;

  @ApiProperty({
    example: 'tgen_20260717abcdef',
    nullable: true,
    description: '토스페이먼츠 paymentKey',
  })
  providerPaymentId!: string | null;

  @ApiProperty({
    example: 'https://dashboard.tosspayments.com/receipt/redirection?...',
    nullable: true,
    description: '영수증 URL',
  })
  receiptUrl!: string | null;

  @ApiProperty({
    example: '2026-07-17T10:00:00.000Z',
    nullable: true,
    description: '결제 완료 시간',
  })
  paidAt!: Date | null;

  @ApiProperty({ example: '2026-07-17T09:59:00.000Z', description: '생성일' })
  createdAt!: Date;
}
