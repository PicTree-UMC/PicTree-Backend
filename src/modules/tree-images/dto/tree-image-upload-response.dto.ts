import { ApiProperty } from '@nestjs/swagger';
import { TreeImageResponseDto } from './tree-image-response.dto';

export class TreeImageUploadResponseDto {
  @ApiProperty({ type: TreeImageResponseDto, description: '업로드된 사진' })
  image!: TreeImageResponseDto;
}
