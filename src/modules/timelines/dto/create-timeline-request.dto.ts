import { TimelineCategory } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTimelineRequestDto {
  @ApiPropertyOptional({
    example: 1,
    nullable: true,
    description: '연결할 나무 ID',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  treeId?: number | null;

  @ApiProperty({ example: '오아시스 만난 곳', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title!: string;

  @ApiPropertyOptional({
    example: '즐겁게 산책했다.',
    nullable: true,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  content?: string | null;

  @ApiProperty({ enum: TimelineCategory, example: TimelineCategory.VISIT })
  @IsEnum(TimelineCategory)
  category!: TimelineCategory;

  @ApiProperty({
    example: '2026-07-16T09:30:00.000Z',
    format: 'date-time',
    description: '방문 일시',
  })
  @IsISO8601({ strict: true })
  visitedAt!: string;
}
