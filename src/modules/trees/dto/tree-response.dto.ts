import { ApiProperty } from '@nestjs/swagger';

export class CreateTreeResponseDto {
  @ApiProperty({ example: 1, description: '생성된 나무 ID' })
  treeId!: number;

  @ApiProperty({
    example: true,
    description: '광고 노출 필요 여부 (무료 사용자, 2개 등록마다 true)',
  })
  adRequired!: boolean;
}

export class TreeImageResponseDto {
  @ApiProperty({ example: 10, description: '사진 ID' })
  imageId!: number;

  @ApiProperty({
    example: 'https://.../a.jpg?X-Amz-Signature=...',
    description: '사진 조회용 임시 서명 URL (presigned, 24시간 유효)',
  })
  imageUrl!: string;
}

export class TreeSummaryResponseDto {
  @ApiProperty({ example: 1, description: '나무 ID' })
  treeId!: number;

  @ApiProperty({ example: '우리 동네 벚나무', description: '나무 이름' })
  name!: string;

  @ApiProperty({
    example: '산책로 입구',
    nullable: true,
    description: '타임라인 카드에 표시할 기록 내용',
  })
  description!: string | null;

  @ApiProperty({ example: 37.5665, description: '위도' })
  latitude!: number;

  @ApiProperty({ example: 126.978, description: '경도' })
  longitude!: number;

  @ApiProperty({ example: '😍', description: '기분 이모지' })
  mood!: string;

  @ApiProperty({ example: 'DEFAULT_1', description: '기본 이미지' })
  defaultImage!: string;

  @ApiProperty({
    example: 'https://.../a.jpg?X-Amz-Signature=...',
    nullable: true,
    description:
      '대표 사진 URL (presigned). 사진이 없으면 null → 기본 이미지로 표시',
  })
  imageUrl!: string | null;

  @ApiProperty({ example: false, description: '즐겨찾기 여부' })
  isFavorite!: boolean;

  @ApiProperty({
    example: '2026-07-19T10:00:00.000Z',
    format: 'date-time',
    description: '나무 등록일(타임라인 정렬·그룹 기준)',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2026-07-19T10:10:00.000Z',
    format: 'date-time',
    description: '마지막 수정일',
  })
  updatedAt!: Date;
}

export class TreeResponseDto {
  @ApiProperty({ example: 1, description: '나무 ID' })
  treeId!: number;

  @ApiProperty({ example: '우리 동네 벚나무', description: '나무 이름' })
  name!: string;

  @ApiProperty({
    example: '산책로 입구',
    nullable: true,
    description: '한 줄 코멘트',
  })
  description!: string | null;

  @ApiProperty({ example: 37.5665, description: '위도' })
  latitude!: number;

  @ApiProperty({ example: 126.978, description: '경도' })
  longitude!: number;

  @ApiProperty({
    example: '서울시 중구 ...',
    nullable: true,
    description: '주소',
  })
  address!: string | null;

  @ApiProperty({ example: '😍', description: '기분 이모지' })
  mood!: string;

  @ApiProperty({ example: 'DEFAULT_1', description: '기본 이미지' })
  defaultImage!: string;

  @ApiProperty({ example: false, description: '즐겨찾기 여부' })
  isFavorite!: boolean;

  @ApiProperty({ type: [TreeImageResponseDto], description: '사진 목록' })
  images!: TreeImageResponseDto[];

  @ApiProperty({
    example: '2026-07-19T10:00:00.000Z',
    format: 'date-time',
    description: '생성일',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2026-07-19T10:10:00.000Z',
    format: 'date-time',
    description: '수정일',
  })
  updatedAt!: Date;
}
