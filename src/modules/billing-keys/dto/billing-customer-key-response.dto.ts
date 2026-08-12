import { ApiProperty } from '@nestjs/swagger';

export class BillingCustomerKeyResponseDto {
  @ApiProperty({
    example: 'BILLING_4f75b7d3d2b7b37b8c4e...',
    description: '토스페이먼츠 결제수단 인증에 사용할 customerKey',
  })
  customerKey!: string;
}
