import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';
import { Coordinate } from '../../../common/constants/coordinate.constant';
import { toNumberIfNotBlank } from '../../../common/transformers/to-number-if-not-blank.transformer';

export class CheckNearbyAlertRequestDto {
  @ApiProperty({ example: 37.5665 })
  @Transform(toNumberIfNotBlank)
  @IsNumber()
  @Min(Coordinate.MIN_LATITUDE)
  @Max(Coordinate.MAX_LATITUDE)
  latitude!: number;

  @ApiProperty({ example: 126.978 })
  @Transform(toNumberIfNotBlank)
  @IsNumber()
  @Min(Coordinate.MIN_LONGITUDE)
  @Max(Coordinate.MAX_LONGITUDE)
  longitude!: number;
}
