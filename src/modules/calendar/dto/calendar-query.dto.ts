import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class CalendarQueryDto {
  @ApiProperty({ example: 2026, description: '조회 연도' })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(9999)
  year!: number;

  @ApiProperty({ example: 4, description: '조회 월(1-12)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;
}
