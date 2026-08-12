import { ApiProperty } from '@nestjs/swagger';
import { TreeSummaryResponseDto } from './tree-response.dto';

export class TreeListResponseDto {
  @ApiProperty({ type: [TreeSummaryResponseDto], description: '나무 목록' })
  items!: TreeSummaryResponseDto[];

  @ApiProperty({ example: 1, description: '현재 페이지' })
  page!: number;

  @ApiProperty({ example: 20, description: '페이지 크기' })
  size!: number;

  @ApiProperty({ example: 42, description: '전체 나무 수' })
  total!: number;

  @ApiProperty({ example: 3, description: '전체 페이지 수' })
  totalPages!: number;
}
