import { ApiProperty } from '@nestjs/swagger';
import { AuthUserResponseDto } from './auth-user-response.dto';

export class SocialLoginResponseDto {
  @ApiProperty({ example: true, description: '신규 가입 여부' })
  isNewUser!: boolean;

  @ApiProperty({ example: true, description: '약관 동의 필요 여부' })
  needTermsAgreement!: boolean;

  @ApiProperty({ example: false, description: '추가 프로필 설정 필요 여부' })
  needProfileSetup!: boolean;

  @ApiProperty({
    example: '서비스 JWT Access Token',
    description: '서비스 Access Token',
  })
  accessToken!: string;

  @ApiProperty({ example: 3600, description: 'Access Token 만료 시간(초)' })
  expiresIn!: number;

  @ApiProperty({ type: AuthUserResponseDto, description: '로그인 사용자 정보' })
  user!: AuthUserResponseDto;
}
