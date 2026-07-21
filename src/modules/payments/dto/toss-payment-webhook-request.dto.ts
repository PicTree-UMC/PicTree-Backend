import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsObject, IsOptional, IsString } from 'class-validator';

export class TossPaymentWebhookRequestDto {
  @ApiProperty({ example: 'PAYMENT_STATUS_CHANGED' })
  @IsString()
  eventType!: string;

  @ApiProperty({ example: '2026-07-22T10:00:00.000000+09:00' })
  @IsISO8601()
  createdAt!: string;

  @ApiPropertyOptional({
    example: {
      paymentKey: 'tgen_20260722abcdef',
      orderId: 'ORDER_1_lzk6q9x7_a1b2c3d4',
      status: 'DONE',
    },
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
