import { ApiProperty } from '@nestjs/swagger';

export class SubscriptionPlanFeatureResponseDto {
  @ApiProperty({ example: 'PHOTO_STORAGE', description: '기능 코드' })
  code!: string;

  @ApiProperty({ example: '사진 저장 용량', description: '기능명' })
  name!: string;

  @ApiProperty({
    example: '요금제별 사진 저장 가능 용량',
    nullable: true,
    description: '기능 설명',
  })
  description!: string | null;

  @ApiProperty({ example: 'LIMIT', description: '값 유형' })
  valueType!: string;

  @ApiProperty({ example: 'GB', nullable: true, description: '단위' })
  unit!: string | null;

  @ApiProperty({ example: true, description: '기능 제공 여부' })
  isEnabled!: boolean;

  @ApiProperty({ example: 1, nullable: true, description: '제한 값' })
  limitValue!: number | null;

  @ApiProperty({ example: '광고 제거', nullable: true, description: '문자 값' })
  textValue!: string | null;
}
