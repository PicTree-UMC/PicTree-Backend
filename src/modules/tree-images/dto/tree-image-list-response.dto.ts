import { ApiProperty } from '@nestjs/swagger';
import { TreeImageResponseDto } from './tree-image-response.dto';

export class TreeImageListResponseDto {
  @ApiProperty({ type: [TreeImageResponseDto], description: '사진 목록' })
  images!: TreeImageResponseDto[];
}
