import { ApiProperty } from '@nestjs/swagger';

export class NearbyTreeResponseDto {
  @ApiProperty({ example: 1, description: '나무 ID' })
  treeId!: number;

  @ApiProperty({ example: '우리 동네 벚나무' })
  name!: string;

  @ApiProperty({ example: 37.5665 })
  latitude!: number;

  @ApiProperty({ example: 126.978 })
  longitude!: number;

  @ApiProperty({ example: 'HAPPY' })
  mood!: string;

  @ApiProperty({ example: 'DEFAULT_1' })
  defaultImage!: string;

  @ApiProperty({ example: 42, description: '현재 위치로부터의 거리(미터)' })
  distanceM!: number;
}
