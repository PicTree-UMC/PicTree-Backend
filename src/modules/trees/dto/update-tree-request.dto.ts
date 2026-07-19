import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { TreeMood } from '../trees.constant';
import type { TreeMoodType } from '../trees.constant';

export class UpdateTreeRequestDto {
  @ApiPropertyOptional({
    example: '수정된 이름',
    maxLength: 100,
    description: '변경할 이름',
  })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: '수정된 설명',
    maxLength: 500,
    nullable: true,
    description: '변경할 한 줄 코멘트',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ApiPropertyOptional({
    example: '서울시 중구 ...',
    maxLength: 255,
    nullable: true,
    description: '변경할 주소',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string | null;

  @ApiPropertyOptional({
    example: 'SAD',
    enum: TreeMood,
    description: '변경할 기분 이모지',
  })
  @ValidateIf((_, value) => value !== undefined)
  @IsIn(Object.values(TreeMood))
  mood?: TreeMoodType;

  @ApiPropertyOptional({
    example: 'DEFAULT_2',
    maxLength: 20,
    description: '변경할 기본 이미지',
  })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  defaultImage?: string;
}
