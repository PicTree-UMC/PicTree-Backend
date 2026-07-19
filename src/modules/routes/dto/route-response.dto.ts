import { ApiProperty } from '@nestjs/swagger';

export class CreateRouteResponseDto {
  @ApiProperty({ example: 1, description: '생성된 동선 ID' })
  routeId!: number;
}

export class RoutePointResponseDto {
  @ApiProperty({ example: 37.5665, description: '위도' })
  latitude!: number;

  @ApiProperty({ example: 126.978, description: '경도' })
  longitude!: number;

  @ApiProperty({ example: 0, description: '좌표 순서' })
  sequence!: number;
}

export class RouteSummaryResponseDto {
  @ApiProperty({ example: 1, description: '동선 ID' })
  routeId!: number;

  @ApiProperty({ example: '아침 산책', description: '동선 이름' })
  routeName!: string;

  @ApiProperty({
    example: 1200,
    nullable: true,
    description: '총 이동 거리(m)',
  })
  totalDistanceM!: number | null;

  @ApiProperty({
    example: '2026-07-19T07:00:00.000Z',
    format: 'date-time',
    description: '동선 시작 시각',
  })
  startedAt!: Date;
}

export class RouteResponseDto {
  @ApiProperty({ example: 1, description: '동선 ID' })
  routeId!: number;

  @ApiProperty({ example: '아침 산책', description: '동선 이름' })
  routeName!: string;

  @ApiProperty({
    example: 1200,
    nullable: true,
    description: '총 이동 거리(m)',
  })
  totalDistanceM!: number | null;

  @ApiProperty({
    example: '2026-07-19T07:00:00.000Z',
    format: 'date-time',
    description: '동선 시작 시각',
  })
  startedAt!: Date;

  @ApiProperty({
    example: '2026-07-19T07:30:00.000Z',
    format: 'date-time',
    nullable: true,
    description: '동선 종료 시각',
  })
  endedAt!: Date | null;

  @ApiProperty({
    type: [RoutePointResponseDto],
    description: '동선 좌표 목록 (순서 오름차순)',
  })
  points!: RoutePointResponseDto[];
}
