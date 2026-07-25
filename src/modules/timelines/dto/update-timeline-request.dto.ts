import { TimelineCategory } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class UpdateTimelineRequestDto {
  @ApiPropertyOptional({
    example: 1,
    nullable: true,
    description: '변경할 나무 ID, null이면 연결 해제',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  treeId?: number | null;

  @ApiPropertyOptional({ example: '수정한 제목', maxLength: 100 })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({
    example: '수정한 기록 내용',
    nullable: true,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  content?: string | null;

  @ApiPropertyOptional({ enum: TimelineCategory })
  @ValidateIf((_, value) => value !== undefined)
  @IsEnum(TimelineCategory)
  category?: TimelineCategory;

  @ApiPropertyOptional({
    example: '2026-07-16T10:00:00.000Z',
    format: 'date-time',
  })
  @ValidateIf((_, value) => value !== undefined)
  @IsISO8601({ strict: true })
  visitedAt?: string;
}
