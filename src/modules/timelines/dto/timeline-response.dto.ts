import { TimelineCategory } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class TimelineTreeResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: '오아시스 만난 곳' })
  name!: string;

  @ApiProperty({ example: 'HAPPY' })
  mood!: string;

  @ApiProperty({
    example: 'https://example.com/default-tree.png',
    description: '기본 나무 이미지 식별자',
  })
  defaultImage!: string;
}

export class TimelineResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 1 })
  userId!: number;

  @ApiProperty({ example: 1, nullable: true })
  treeId!: number | null;

  @ApiProperty({ example: '오아시스 만난 곳' })
  title!: string;

  @ApiProperty({ example: '즐겁게 산책했다.', nullable: true })
  content!: string | null;

  @ApiProperty({ enum: TimelineCategory, example: TimelineCategory.VISIT })
  category!: TimelineCategory;

  @ApiProperty({ format: 'date-time' })
  visitedAt!: Date;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;

  @ApiProperty({ type: TimelineTreeResponseDto, nullable: true })
  tree!: TimelineTreeResponseDto | null;
}

export class TimelineListResponseDto {
  @ApiProperty({ type: [TimelineResponseDto] })
  items!: TimelineResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  size!: number;

  @ApiProperty({ example: 42 })
  totalElements!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;

  @ApiProperty({ example: true })
  hasNext!: boolean;
}
