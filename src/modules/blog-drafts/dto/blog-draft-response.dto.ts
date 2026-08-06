import { ApiProperty } from '@nestjs/swagger';

export class BlogDraftItemResponseDto {
  @ApiProperty({ example: '포그레인 공원', description: '장소명' })
  placeName!: string;

  @ApiProperty({
    example: '해 질 무렵 공원을 걸었음. 조용해서 산책하기 좋았음.',
    description: '장소별 초안 본문',
  })
  content!: string;
}

export class BlogDraftDetailItemResponseDto {
  @ApiProperty({ example: 1, nullable: true, description: '연결된 나무 ID' })
  treeId!: number | null;

  @ApiProperty({ example: '포그레인 공원', description: '장소명' })
  placeName!: string;

  @ApiProperty({
    example: '해 질 무렵 공원을 걸었음. 조용해서 산책하기 좋았음.',
    description: '장소별 초안 본문',
  })
  content!: string;
}

export class GeneratedBlogDraftResponseDto {
  @ApiProperty({
    example: '[여행 기록] 3월 31일 ~ 4월 1일',
    description: '초안 제목',
  })
  title!: string;

  @ApiProperty({
    type: [BlogDraftItemResponseDto],
    description: '장소별 초안 본문 목록',
  })
  items!: BlogDraftItemResponseDto[];

  @ApiProperty({ example: '2026-03-31', description: '시작일' })
  startDate!: string;

  @ApiProperty({ example: '2026-04-01', description: '종료일' })
  endDate!: string;
}

export class BlogDraftSummaryResponseDto {
  @ApiProperty({ example: 1, description: '초안 ID' })
  draftId!: number;

  @ApiProperty({
    example: '[여행 기록] 3월 31일 ~ 4월 1일',
    description: '초안 제목',
  })
  title!: string;

  @ApiProperty({ example: '2026-03-31', description: '시작일' })
  startDate!: string;

  @ApiProperty({ example: '2026-04-01', description: '종료일' })
  endDate!: string;

  @ApiProperty({
    example: '2026-04-01T12:00:00',
    description: '생성 시각',
  })
  createdAt!: string;
}

export class BlogDraftListResponseDto {
  @ApiProperty({
    type: [BlogDraftSummaryResponseDto],
    description: '저장된 초안 목록',
  })
  drafts!: BlogDraftSummaryResponseDto[];
}

export class SavedBlogDraftResponseDto {
  @ApiProperty({ example: 1, description: '저장된 초안 ID' })
  draftId!: number;
}

export class BlogDraftDetailResponseDto {
  @ApiProperty({ example: 1, description: '초안 ID' })
  draftId!: number;

  @ApiProperty({
    example: '[여행 기록] 3월 31일 ~ 4월 1일',
    description: '초안 제목',
  })
  title!: string;

  @ApiProperty({
    type: [BlogDraftDetailItemResponseDto],
    description: '장소별 초안 본문 목록',
  })
  items!: BlogDraftDetailItemResponseDto[];

  @ApiProperty({ example: '2026-03-31', description: '시작일' })
  startDate!: string;

  @ApiProperty({ example: '2026-04-01', description: '종료일' })
  endDate!: string;

  @ApiProperty({
    example: '2026-04-01T12:00:00',
    description: '생성 시각',
  })
  createdAt!: string;
}
