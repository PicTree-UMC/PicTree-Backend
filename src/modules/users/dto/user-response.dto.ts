import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
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

  @ApiProperty({ example: 'USER', description: '유저 역할' })
  role!: string;

  @ApiProperty({ example: 'ACTIVE', description: '유저 상태' })
  status!: string;

  @ApiProperty({ example: 'FREE', description: '현재 구독 플랜' })
  currentPlan!: string;

  @ApiProperty({ example: true, description: '알림 수신 여부' })
  notification!: boolean;

  @ApiProperty({
    example: '2026-07-14T10:00:00.000Z',
    format: 'date-time',
    description: '생성일',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2026-07-14T10:10:00.000Z',
    format: 'date-time',
    description: '수정일',
  })
  updatedAt!: Date;
}
