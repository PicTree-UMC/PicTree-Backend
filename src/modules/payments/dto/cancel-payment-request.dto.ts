import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CancelPaymentRequestDto {
  @ApiProperty({
    example: '사용자 요청으로 인한 결제 취소',
    description: '결제 취소 사유',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  cancelReason!: string;
}
