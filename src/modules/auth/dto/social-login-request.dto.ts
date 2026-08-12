import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, IsUrl } from 'class-validator';
import { SocialProvider } from '../auth.types';

export class SocialLoginRequestDto {
  @ApiProperty({
    enum: SocialProvider,
    example: SocialProvider.KAKAO,
    description: '소셜 로그인 제공자',
  })
  @IsEnum(SocialProvider)
  provider!: SocialProvider;

  @ApiProperty({
    example: '인가 코드',
    description: '소셜 로그인 후 발급받은 인가 코드',
  })
  @IsString()
  @IsNotEmpty()
  authorizationCode!: string;

  @ApiProperty({
    example: 'https://example.com/oauth/callback',
    description: '인가 코드 요청 시 사용한 Redirect URI',
  })
  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_tld: false })
  redirectUri!: string;
}
