import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';
import { Coordinate } from '../../../common/constants/coordinate.constant';

export class CheckNearbyAlertRequestDto {
  @ApiProperty({ example: 37.5665 })
  @Type(() => Number)
  @IsNumber()
  @Min(Coordinate.MIN_LATITUDE)
  @Max(Coordinate.MAX_LATITUDE)
  latitude!: number;

  @ApiProperty({ example: 126.978 })
  @Type(() => Number)
  @IsNumber()
  @Min(Coordinate.MIN_LONGITUDE)
  @Max(Coordinate.MAX_LONGITUDE)
  longitude!: number;
}
