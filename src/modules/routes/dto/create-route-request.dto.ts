import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  ROUTE_POINT_MAX_COUNT,
  ROUTE_POINT_MIN_COUNT,
} from '../routes.constant';

export class CreateRoutePointRequestDto {
  @ApiProperty({ example: 1, description: '나무(장소) ID' })
  @IsInt()
  @Min(1)
  treeId!: number;

  @ApiProperty({ example: 0, description: '방문 순서 (0부터)' })
  @IsInt()
  @Min(0)
  sequence!: number;
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

  @ApiProperty({
    type: [CreateRoutePointRequestDto],
    description: '동선 노드 목록 (나무를 방문 순서로, 1개 이상)',
  })
  @IsArray()
  @ArrayMinSize(ROUTE_POINT_MIN_COUNT)
  @ArrayMaxSize(ROUTE_POINT_MAX_COUNT)
  @ValidateNested({ each: true })
  @Type(() => CreateRoutePointRequestDto)
  points!: CreateRoutePointRequestDto[];
}
