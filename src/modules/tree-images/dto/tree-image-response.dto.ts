import { ApiProperty } from '@nestjs/swagger';

export class TreeImageResponseDto {
  @ApiProperty({ example: 10, description: '사진 ID' })
  imageId!: number;

  @ApiProperty({
    example: 'https://.../a.jpg?X-Amz-Signature=...',
    description: '사진 조회용 임시 서명 URL (presigned)',
  })
  imageUrl!: string;

  @ApiProperty({
    example: null,
    nullable: true,
    description: '연결된 타임라인 기록 ID (없으면 장소 대표 사진)',
  })
  timelineRecordId!: number | null;

  @ApiProperty({ example: 204800, description: '파일 크기(byte)' })
  fileSize!: number;
}
