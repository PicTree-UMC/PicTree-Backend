import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';
import { Coordinate } from '../../../common/constants/coordinate.constant';

export class GetNearbyTreesQueryDto {
  @ApiProperty({ example: 37.5665, description: '현재 위도' })
  @Type(() => Number)
  @IsNumber()
  @Min(Coordinate.MIN_LATITUDE)
  @Max(Coordinate.MAX_LATITUDE)
  lat!: number;

  @ApiProperty({ example: 126.978, description: '현재 경도' })
  @Type(() => Number)
  @IsNumber()
  @Min(Coordinate.MIN_LONGITUDE)
  @Max(Coordinate.MAX_LONGITUDE)
  lng!: number;
}
