import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Coordinate, TreeMood } from '../trees.constant';

export class CreateTreeRequestDto {
  @ApiProperty({
    example: '우리 동네 벚나무',
    maxLength: 100,
    description: '나무(장소) 이름',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    example: '산책로 입구에 있는 나무',
    maxLength: 500,
    description: '한 줄 코멘트',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

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

  @ApiPropertyOptional({
    example: '서울시 중구 ...',
    maxLength: 255,
    description: '주소',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiProperty({ example: 'HAPPY', enum: TreeMood, description: '기분 이모지' })
  @IsIn(Object.values(TreeMood))
  mood!: string;

  @ApiProperty({
    example: 'DEFAULT_1',
    maxLength: 20,
    description: '기본 이미지 (사진 없을 때 노출)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  defaultImage!: string;
}
