import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

// multipart/form-data 의 파일 외 필드입니다. 파일(images)은 인터셉터로 처리합니다.
export class UploadTreeImageRequestDto {
  @ApiPropertyOptional({
    example: 5,
    description:
      '특정 타임라인 기록의 사진일 때만 전달 (없으면 장소 대표 사진)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  timelineRecordId?: number;
}
