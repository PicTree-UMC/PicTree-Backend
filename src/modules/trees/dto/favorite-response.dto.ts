import { ApiProperty } from '@nestjs/swagger';

export class FavoriteTreeResponseDto {
  @ApiProperty({ example: 1, description: '나무 ID' })
  treeId!: number;

  @ApiProperty({ example: '오아시스 만난 곳', description: '장소 이름' })
  name!: string;

  @ApiProperty({
    example: '길 가다가 오아시스 자만추',
    nullable: true,
    description: '한 줄 코멘트',
  })
  description!: string | null;

  @ApiProperty({
    example: '2026-03-30',
    description: '나무 생성일 (KST, YYYY-MM-DD)',
  })
  createdAt!: string;

  @ApiProperty({
    example: 'https://.../a.jpg?X-Amz-Signature=...',
    nullable: true,
    description: '장소 이미지 URL (presigned)',
  })
  imageUrl!: string | null;
}

export class FavoriteTreeListResponseDto {
  @ApiProperty({ example: 2, description: '즐겨찾기 장소 개수' })
  count!: number;

  @ApiProperty({
    type: [FavoriteTreeResponseDto],
    description: '즐겨찾기 장소 목록',
  })
  favorites!: FavoriteTreeResponseDto[];
}

export class ToggleFavoriteResponseDto {
  @ApiProperty({ example: 1, description: '나무 ID' })
  treeId!: number;

  @ApiProperty({ example: true, description: '즐겨찾기 상태' })
  isFavorite!: boolean;
}
