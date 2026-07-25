import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class TimelineIdParamDto {
  @ApiProperty({ example: 1, description: '타임라인 ID' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  timelineId!: number;
}
