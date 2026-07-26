import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';

export class GenerateBlogDraftRequestDto {
  @ApiProperty({ example: '2026-03-31', description: '시작일' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-04-01', description: '종료일' })
  @IsDateString()
  endDate!: string;

  @ApiProperty({ example: [1, 2, 3], description: '선택한 장소 ID 목록' })
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  treeIds!: number[];
}
