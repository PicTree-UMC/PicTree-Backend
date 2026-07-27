import { ApiProperty } from '@nestjs/swagger';

export class GeneratedBlogDraftResponseDto {
  @ApiProperty({
    example: '[여행 기록] 3월 31일 ~ 4월 1일',
    description: '초안 제목',
  })
  title!: string;

  @ApiProperty({
    example: '생성된 블로그 초안 내용입니다.',
    description: '초안 본문',
  })
  content!: string;

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
    example: '생성된 AI 블로그 초안 내용입니다.',
    description: '초안 본문',
  })
  content!: string;

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
