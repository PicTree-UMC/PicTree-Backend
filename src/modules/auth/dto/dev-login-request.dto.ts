import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class DevLoginRequestDto {
  @ApiProperty({ example: 1, description: '로그인할 유저 ID' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId!: number;
}
