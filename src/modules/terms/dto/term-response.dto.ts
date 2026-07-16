import { ApiProperty } from '@nestjs/swagger';

export class TermResponseDto {
  @ApiProperty({ example: 1, description: '약관 ID' })
  id!: number;

  @ApiProperty({ example: '서비스 이용약관', description: '약관명' })
  title!: string;

  @ApiProperty({ example: 'SERVICE', description: '약관 유형' })
  type!: string;

  @ApiProperty({ example: '1.0', description: '약관 버전' })
  version!: string;

  @ApiProperty({
    example: 'https://example.com/terms/service-v1.html',
    nullable: true,
    description: '약관 내용 URL',
  })
  contentUrl!: string | null;

  @ApiProperty({ example: true, description: '필수 동의 여부' })
  isRequired!: boolean;

  @ApiProperty({
    example: '2026-07-16T00:00:00.000Z',
    description: '약관 시행일',
  })
  effectiveFrom!: Date;
}
