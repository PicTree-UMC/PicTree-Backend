import { ApiProperty } from '@nestjs/swagger';

export class RouteImageResponseDto {
  @ApiProperty({ example: 1, description: '나무(장소) ID' })
  treeId!: number;

  @ApiProperty({ example: '오아시스 만난 곳', description: '장소명' })
  name!: string;

  @ApiProperty({
    example: 'https://.../a.jpg?X-Amz-Signature=...',
    nullable: true,
    description:
      '사진 URL (presigned). 사진 없으면 null → 프론트에서 로고 표시',
  })
  imageUrl!: string | null;
}

export class RouteImageListResponseDto {
  @ApiProperty({
    type: [RouteImageResponseDto],
    description: '방문한 장소 사진 (방문 순서). 사진 없는 장소는 imageUrl=null',
  })
  images!: RouteImageResponseDto[];
}
