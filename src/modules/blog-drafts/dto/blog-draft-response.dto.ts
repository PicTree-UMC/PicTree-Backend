import { ApiProperty } from '@nestjs/swagger';

export class BlogDraftDetailItemResponseDto {
  @ApiProperty({ example: 1, nullable: true, description: '연결된 나무 ID' })
  treeId!: number | null;

  @ApiProperty({
    example: 'https://.../a.jpg?X-Amz-Signature=...',
    nullable: true,
    description: '장소 대표 이미지 URL (presigned)',
  })
  imageUrl!: string | null;

  @ApiProperty({ example: '포그레인 공원', description: '장소명' })
  placeName!: string;

  @ApiProperty({
    example: '해 질 무렵 공원을 걸었음. 조용해서 산책하기 좋았음.',
    description: '장소별 초안 본문',
  })
  content!: string;
}

export class BlogDraftDayResponseDto {
  @ApiProperty({ example: '2026-03-31', description: '방문 날짜 (KST)' })
  date!: string;

  @ApiProperty({
    type: [BlogDraftDetailItemResponseDto],
    description: '해당 날짜의 장소별 초안 본문 목록',
  })
  items!: BlogDraftDetailItemResponseDto[];
}

export class GeneratedBlogDraftResponseDto {
  @ApiProperty({
    example: '[여행 기록] 3월 31일 ~ 4월 1일',
    description: '초안 제목',
  })
  title!: string;

  @ApiProperty({
    type: [BlogDraftDayResponseDto],
    description: '날짜별 초안 본문 목록',
  })
  days!: BlogDraftDayResponseDto[];

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

  @ApiProperty({
    example: 'https://.../a.jpg?X-Amz-Signature=...',
    nullable: true,
    description: '초안 썸네일 이미지 URL (첫 번째 장소 대표 이미지, presigned)',
  })
  thumbnailUrl!: string | null;

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

export class BlogDraftUsageResponseDto {
  @ApiProperty({
    example: 'FREE',
    enum: ['FREE', 'PLUS', 'PRO', 'MAX'],
    description: '현재 적용 중인 요금제',
  })
  plan!: string;

  @ApiProperty({ example: 1, description: '현재 이용 기간의 생성 한도' })
  limit!: number;

  @ApiProperty({ example: 0, description: '현재 이용 기간에 사용한 횟수' })
  usedCount!: number;

  @ApiProperty({ example: 1, description: '현재 이용 기간에 남은 생성 횟수' })
  remainingCount!: number;

  @ApiProperty({
    example: '2026-08-01T00:00:00',
    description: '사용량 집계 시작 시각 (KST, 포함)',
  })
  periodStartAt!: string;

  @ApiProperty({
    example: '2026-09-01T00:00:00',
    description: '사용량 집계 종료 시각 (KST, 미포함)',
  })
  periodEndAt!: string;
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
    type: [BlogDraftDayResponseDto],
    description: '날짜별 초안 본문 목록',
  })
  days!: BlogDraftDayResponseDto[];

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
