import { ApiProperty } from '@nestjs/swagger';
import { PaymentResponseDto } from './payment-response.dto';

export class PaymentListResponseDto {
  @ApiProperty({ type: [PaymentResponseDto], description: '결제 내역 목록' })
  items!: PaymentResponseDto[];

  @ApiProperty({ example: 1, description: '현재 페이지' })
  page!: number;

  @ApiProperty({ example: 20, description: '페이지 크기' })
  size!: number;

  @ApiProperty({ example: 42, description: '전체 결제 내역 수' })
  total!: number;

  @ApiProperty({ example: 3, description: '전체 페이지 수' })
  totalPages!: number;
}
