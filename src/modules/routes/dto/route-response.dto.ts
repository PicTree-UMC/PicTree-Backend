import { ApiProperty } from '@nestjs/swagger';

export class CreateRouteResponseDto {
  @ApiProperty({ example: 1, description: '생성된 동선 ID' })
  routeId!: number;
}

export class RoutePointResponseDto {
  @ApiProperty({ example: 1, description: '나무(장소) ID' })
  treeId!: number;

  @ApiProperty({ example: '오아시스 만난 곳', description: '장소명' })
  name!: string;

  @ApiProperty({ example: '😍', description: '기분 이모지' })
  mood!: string;

  @ApiProperty({
    example: '갤러거 형제 자만추',
    nullable: true,
    description: '한줄평',
  })
  description!: string | null;

  @ApiProperty({ example: 37.5665, description: '위도' })
  latitude!: number;

  @ApiProperty({ example: 126.978, description: '경도' })
  longitude!: number;

  @ApiProperty({
    example: '2026-04-01',
    description:
      '방문 날짜 (KST, YYYY-MM-DD). 프론트에서 날짜별 세그먼트 구분에 사용',
  })
  date!: string;

  @ApiProperty({ example: 0, description: '방문 순서 (날짜 순)' })
  sequence!: number;
}

export class RouteSummaryPlaceDto {
  @ApiProperty({ example: '오아시스 만난 곳', description: '장소명' })
  name!: string;

  @ApiProperty({ example: '😍', description: '기분 이모지' })
  mood!: string;
}

export class RouteSummaryResponseDto {
  @ApiProperty({ example: 1, description: '동선 ID' })
  routeId!: number;

  @ApiProperty({ example: '아침 산책', description: '동선 이름' })
  routeName!: string;

  @ApiProperty({
    type: [String],
    example: ['2026-03-31', '2026-04-01'],
    description: '기록 날짜들 (KST, 오름차순, 최대 3일)',
  })
  recordDates!: string[];

  @ApiProperty({ example: 2, description: '장소 개수' })
  placeCount!: number;

  @ApiProperty({
    type: [RouteSummaryPlaceDto],
    description: '장소 목록 (방문 순서)',
  })
  places!: RouteSummaryPlaceDto[];

  @ApiProperty({
    example: '2026-07-19T07:00:00.000Z',
    format: 'date-time',
    description: '저장일',
  })
  createdAt!: Date;
}

export class RouteResponseDto {
  @ApiProperty({ example: 1, description: '동선 ID' })
  routeId!: number;

  @ApiProperty({ example: '아침 산책', description: '동선 이름' })
  routeName!: string;

  @ApiProperty({
    example: '2026-07-19T07:00:00.000Z',
    format: 'date-time',
    description: '저장일',
  })
  createdAt!: Date;

  @ApiProperty({
    type: [RoutePointResponseDto],
    description: '동선 노드 목록 (방문 순서 오름차순, 삭제된 나무 제외)',
  })
  points!: RoutePointResponseDto[];
}
