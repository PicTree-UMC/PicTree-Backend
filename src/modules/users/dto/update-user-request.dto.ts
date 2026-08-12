import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateUserRequestDto {
  @ApiPropertyOptional({
    example: '새닉네임',
    maxLength: 50,
    description: '변경할 닉네임',
  })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  nickname?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/profile.jpg',
    nullable: true,
    maxLength: 500,
    description: '변경할 프로필 이미지 URL, null이면 이미지 제거',
  })
  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  profileImageUrl?: string | null;

  @ApiPropertyOptional({
    example: true,
    description: '알림 수신 여부',
  })
  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  notification?: boolean;
}
