import { NearbyAlertStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CheckNearbyAlertResponseDto {
  @ApiProperty({ example: 2 })
  nearbyCount!: number;

  @ApiProperty({ example: 1 })
  sentCount!: number;
}

export class NearbyAlertLogResponseDto {
  @ApiProperty({ example: 1 })
  alertLogId!: number;

  @ApiProperty({ example: 3 })
  treeId!: number;

  @ApiProperty({ example: '우리 동네 벚나무' })
  treeName!: string;

  @ApiProperty({ example: 'DEFAULT_1' })
  defaultImage!: string;

  @ApiProperty({ example: 42 })
  distanceM!: number;

  @ApiProperty({ enum: NearbyAlertStatus })
  status!: NearbyAlertStatus;

  @ApiProperty({ format: 'date-time' })
  sentAt!: Date;

  @ApiProperty({ format: 'date-time', nullable: true })
  openedAt!: Date | null;
}

export class NearbyAlertLogListResponseDto {
  @ApiProperty({ type: [NearbyAlertLogResponseDto] })
  items!: NearbyAlertLogResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  size!: number;

  @ApiProperty({ example: 3 })
  totalElements!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;

  @ApiProperty({ example: false })
  hasNext!: boolean;
}
