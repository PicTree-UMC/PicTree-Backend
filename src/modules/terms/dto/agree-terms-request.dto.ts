import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsInt,
  Min,
} from 'class-validator';

export class AgreeTermsRequestDto {
  @ApiProperty({
    example: [1, 2, 3],
    description: '동의한 약관 ID 목록',
    type: [Number],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  agreedTermIds!: number[];
}
