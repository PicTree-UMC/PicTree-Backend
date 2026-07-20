import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDate,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Coordinate } from '../../../common/constants/coordinate.constant';
import { ROUTE_POINT_MIN_COUNT } from '../routes.constant';

export class CreateRoutePointRequestDto {
  @ApiProperty({ example: 37.5665, description: '위도' })
  @IsNumber()
  @Min(Coordinate.MIN_LATITUDE)
  @Max(Coordinate.MAX_LATITUDE)
  latitude!: number;

  @ApiProperty({ example: 126.978, description: '경도' })
  @IsNumber()
  @Min(Coordinate.MIN_LONGITUDE)
  @Max(Coordinate.MAX_LONGITUDE)
  longitude!: number;

  @ApiProperty({ example: 0, description: '좌표 순서 (0부터)' })
  @IsInt()
  @Min(0)
  sequence!: number;

  @ApiProperty({
    example: '2026-07-19T07:00:00.000Z',
    format: 'date-time',
    description: '좌표 기록 시각',
  })
  @Type(() => Date)
  @IsDate()
  recordedAt!: Date;
}

export class CreateRouteRequestDto {
  @ApiProperty({
    example: '아침 산책',
    maxLength: 100,
    description: '동선 이름',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  routeName!: string;

  @ApiPropertyOptional({ example: 1200, description: '총 이동 거리(m)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  totalDistanceM?: number;

  @ApiProperty({
    example: '2026-07-19T07:00:00.000Z',
    format: 'date-time',
    description: '동선 시작 시각',
  })
  @Type(() => Date)
  @IsDate()
  startedAt!: Date;

  @ApiPropertyOptional({
    example: '2026-07-19T07:30:00.000Z',
    format: 'date-time',
    description: '동선 종료 시각',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endedAt?: Date;

  @ApiProperty({
    type: [CreateRoutePointRequestDto],
    description: '동선 좌표 목록 (1개 이상)',
  })
  @IsArray()
  @ArrayMinSize(ROUTE_POINT_MIN_COUNT)
  @ValidateNested({ each: true })
  @Type(() => CreateRoutePointRequestDto)
  points!: CreateRoutePointRequestDto[];
}
