import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { DATE_ONLY_REGEX } from '../../../common/constants/date-regex.constant';
import { BLOG_DRAFT_MAX_TREE_COUNT } from '../blog-drafts.constant';

export class SaveBlogDraftItemRequestDto {
  @ApiProperty({ example: 1, description: '연결된 나무 ID' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  treeId!: number;

  @ApiProperty({
    example: 'https://.../a.jpg?X-Amz-Signature=...',
    nullable: true,
    required: false,
    description: '생성 응답에서 받은 이미지 URL (저장에는 사용하지 않음)',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string | null;

  @ApiProperty({ example: '포그레인 공원', description: '장소명' })
  @IsString()
  @IsNotEmpty()
  placeName!: string;

  @ApiProperty({
    example: '해 질 무렵 공원을 걸었음. 조용해서 산책하기 좋았음.',
    description: '장소별 초안 본문',
  })
  @IsString()
  @IsNotEmpty()
  content!: string;
}

export class SaveBlogDraftDayRequestDto {
  @ApiProperty({ example: '2026-03-31', description: '방문 날짜 (KST)' })
  @Matches(DATE_ONLY_REGEX)
  date!: string;

  @ApiProperty({
    type: [SaveBlogDraftItemRequestDto],
    description: '해당 날짜의 장소별 초안 본문 목록',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(BLOG_DRAFT_MAX_TREE_COUNT)
  @ValidateNested({ each: true })
  @Type(() => SaveBlogDraftItemRequestDto)
  items!: SaveBlogDraftItemRequestDto[];
}

export class SaveBlogDraftRequestDto {
  @ApiProperty({
    example: '[여행 기록] 3월 31일 ~ 4월 1일',
    description: '초안 제목',
  })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({
    type: [SaveBlogDraftDayRequestDto],
    description: '날짜별 초안 본문 목록',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaveBlogDraftDayRequestDto)
  days!: SaveBlogDraftDayRequestDto[];

  @ApiProperty({ example: '2026-03-31', description: '시작일' })
  @Matches(DATE_ONLY_REGEX)
  startDate!: string;

  @ApiProperty({ example: '2026-04-01', description: '종료일' })
  @Matches(DATE_ONLY_REGEX)
  endDate!: string;
}
