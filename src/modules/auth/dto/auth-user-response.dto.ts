import { ApiProperty } from '@nestjs/swagger';

export class AuthUserResponseDto {
  @ApiProperty({ example: 1, description: '유저 ID' })
  id!: number;

  @ApiProperty({
    example: 'user@example.com',
    nullable: true,
    description: '유저 이메일',
  })
  email!: string | null;

  @ApiProperty({ example: '승범', description: '닉네임' })
  nickname!: string;

  @ApiProperty({
    example: 'https://example.com/profile.jpg',
    nullable: true,
    description: '프로필 이미지 URL',
  })
  profileImageUrl!: string | null;

  @ApiProperty({ example: 'FREE', description: '현재 구독 플랜' })
  currentPlan!: string;
}
