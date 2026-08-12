import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class ConfirmPaymentRequestDto {
  @ApiProperty({
    example: 'tgen_20260717abcdef',
    description: '토스페이먼츠 paymentKey',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  paymentKey!: string;

  @ApiProperty({
    example: 'ORDER_1_lzk6q9x7_a1b2c3d4',
    description: '주문 ID',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9_-]+$/)
  orderId!: string;

  @ApiProperty({ example: 2900, description: '결제 금액' })
  @IsInt()
  @Min(0)
  amount!: number;
}
