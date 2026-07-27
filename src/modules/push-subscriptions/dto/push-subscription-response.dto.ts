import { ApiProperty } from '@nestjs/swagger';

export class PushSubscriptionResponseDto {
  @ApiProperty({ example: 1 })
  subscriptionId!: number;

  @ApiProperty({ example: 'https://fcm.googleapis.com/fcm/send/...' })
  endpoint!: string;

  @ApiProperty({ example: 'Mozilla/5.0 ...', nullable: true })
  userAgent!: string | null;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}
