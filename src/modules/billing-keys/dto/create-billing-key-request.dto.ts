import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateBillingKeyRequestDto {
  @ApiProperty({
    example: 'auth_mj2GQX...',
    description: '토스페이먼츠 결제수단 인증 성공 후 발급된 authKey',
    maxLength: 300,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  authKey!: string;

  @ApiProperty({
    example: 'BILLING_4f75b7d3d2b7b37b8c4e...',
    description: '결제수단 인증에 사용한 customerKey',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  customerKey!: string;
}
