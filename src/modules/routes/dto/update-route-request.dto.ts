import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, ValidateIf } from 'class-validator';

export class UpdateRouteRequestDto {
  @ApiPropertyOptional({
    example: '저녁 산책',
    maxLength: 100,
    description: '변경할 동선 이름',
  })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  routeName?: string;
}
