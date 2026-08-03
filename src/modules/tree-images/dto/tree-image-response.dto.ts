import { ApiProperty } from '@nestjs/swagger';

export class TreeImageResponseDto {
  @ApiProperty({ example: 10, description: '사진 ID' })
  imageId!: number;

  @ApiProperty({
    example: 'https://.../a.jpg?X-Amz-Signature=...',
    description: '사진 조회용 임시 서명 URL (presigned, 24시간 유효)',
  })
  imageUrl!: string;

  @ApiProperty({ example: 204800, description: '파일 크기(byte)' })
  fileSize!: number;
}
