import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class PushSubscriptionKeysDto {
  @ApiProperty({ description: 'P-256 ECDH 공개키' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  p256dh!: string;

  @ApiProperty({ description: 'Push 인증 시크릿' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  auth!: string;
}

export class CreatePushSubscriptionRequestDto {
  @ApiProperty({ example: 'https://fcm.googleapis.com/fcm/send/...' })
  @IsString()
  @IsUrl({ require_tld: false })
  endpoint!: string;

  @ApiProperty({ type: PushSubscriptionKeysDto })
  @ValidateNested()
  @Type(() => PushSubscriptionKeysDto)
  keys!: PushSubscriptionKeysDto;

  @ApiPropertyOptional({ example: 'Mozilla/5.0 ...' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  userAgent?: string;
}
