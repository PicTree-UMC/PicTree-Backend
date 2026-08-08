import { ApiProperty } from '@nestjs/swagger';

export class TreeSummaryStatsResponseDto {
  @ApiProperty({ example: 2, description: '심은 나무 수 (삭제 제외)' })
  treeCount!: number;

  @ApiProperty({ example: 2, description: '전체 사진 수 (삭제된 나무 제외)' })
  imageCount!: number;

  @ApiProperty({
    example: 33382,
    description: '사진 저장 용량 합계(byte). 표시 단위는 프론트에서 포맷',
  })
  usedBytes!: number;
}
