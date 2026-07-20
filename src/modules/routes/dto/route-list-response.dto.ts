import { ApiProperty } from '@nestjs/swagger';
import { RouteSummaryResponseDto } from './route-response.dto';

export class RouteListResponseDto {
  @ApiProperty({ type: [RouteSummaryResponseDto], description: '동선 목록' })
  items!: RouteSummaryResponseDto[];

  @ApiProperty({ example: 1, description: '현재 페이지' })
  page!: number;

  @ApiProperty({ example: 20, description: '페이지 크기' })
  size!: number;

  @ApiProperty({ example: 42, description: '전체 동선 수' })
  total!: number;

  @ApiProperty({ example: 3, description: '전체 페이지 수' })
  totalPages!: number;
}
