import { ApiProperty } from '@nestjs/swagger';

export class CalendarDayResponseDto {
  @ApiProperty({ example: '2026-04-01', description: '날짜' })
  date!: string;

  @ApiProperty({ example: 4, description: '여행 레벨(0-4)' })
  level!: number;
}

export class CalendarResponseDto {
  @ApiProperty({ example: 2026, description: '조회 연도' })
  year!: number;

  @ApiProperty({ example: 4, description: '조회 월' })
  month!: number;

  @ApiProperty({
    type: [CalendarDayResponseDto],
    description: '날짜별 레벨 목록',
  })
  days!: CalendarDayResponseDto[];
}
