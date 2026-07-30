import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class SaveBlogDraftItemRequestDto {
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

export class SaveBlogDraftRequestDto {
  @ApiProperty({
    example: '[여행 기록] 3월 31일 ~ 4월 1일',
    description: '초안 제목',
  })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({
    type: [SaveBlogDraftItemRequestDto],
    description: '장소별 초안 본문 목록',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaveBlogDraftItemRequestDto)
  items!: SaveBlogDraftItemRequestDto[];

  @ApiProperty({ example: '2026-03-31', description: '시작일' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-04-01', description: '종료일' })
  @IsDateString()
  endDate!: string;

  @ApiProperty({
    example: [1, 2, 3],
    description: '선택한 장소 ID 목록 (최대 15개)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(15)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  treeIds!: number[];
}
