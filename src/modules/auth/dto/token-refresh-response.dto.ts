import { ApiProperty } from '@nestjs/swagger';

export class TokenRefreshResponseDto {
  @ApiProperty({
    example: '새로운 서비스 JWT Access Token',
    description: '새로 발급된 Access Token',
  })
  accessToken!: string;

  @ApiProperty({ example: 3600, description: 'Access Token 만료 시간(초)' })
  expiresIn!: number;
}
