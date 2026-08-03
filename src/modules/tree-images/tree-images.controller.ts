import {
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseFilePipeBuilder,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../../common/responses/api.response';
import { SuccessCode } from '../../common/responses/success-code';
import { AccessTokenGuard } from '../auth/access-token.guard';
import type { JwtPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { TreeImageListResponseDto } from './dto/tree-image-list-response.dto';
import { TreeImageUploadResponseDto } from './dto/tree-image-upload-response.dto';
import { MAX_IMAGE_SIZE_BYTES } from './tree-images.constant';
import {
  ApiDeleteTreeImage,
  ApiGetTreeImages,
  ApiUploadTreeImage,
} from './tree-images.swagger';
import { TreeImagesService } from './tree-images.service';

@ApiTags('Tree Images')
@Controller('trees/:treeId/images')
@UseGuards(AccessTokenGuard)
export class TreeImagesController {
  constructor(private readonly treeImagesService: TreeImagesService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
      // 파일이 메모리에 버퍼링되기 전에 크기를 제한한다.
      limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
    }),
  )
  @ApiUploadTreeImage()
  async uploadImage(
    @CurrentUser() currentUser: JwtPayload,
    @Param('treeId', ParseIntPipe) treeId: number,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: MAX_IMAGE_SIZE_BYTES })
        // 파일 없음은 파이프가 아니라 서비스에서 400(TREE_IMAGE_NO_FILE)으로 처리한다.
        // (true 로 두면 파일 미첨부 시 413 이 나가 Swagger 명세와 어긋난다.)
        .build({
          fileIsRequired: false,
          errorHttpStatusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        }),
    )
    file: Express.Multer.File | undefined,
  ): Promise<ApiResponse<TreeImageUploadResponseDto>> {
    const data = await this.treeImagesService.uploadImage(
      currentUser.userId,
      treeId,
      file,
    );

    return ApiResponse.success(SuccessCode.CREATED, data);
  }

  @Get()
  @ApiGetTreeImages()
  async getImages(
    @CurrentUser() currentUser: JwtPayload,
    @Param('treeId', ParseIntPipe) treeId: number,
  ): Promise<ApiResponse<TreeImageListResponseDto>> {
    const data = await this.treeImagesService.getImages(
      currentUser.userId,
      treeId,
    );

    return ApiResponse.success(SuccessCode.OK, data);
  }

  @Delete(':imageId')
  @ApiDeleteTreeImage()
  async deleteImage(
    @CurrentUser() currentUser: JwtPayload,
    @Param('treeId', ParseIntPipe) treeId: number,
    @Param('imageId', ParseIntPipe) imageId: number,
  ): Promise<ApiResponse<null>> {
    await this.treeImagesService.deleteImage(
      currentUser.userId,
      treeId,
      imageId,
    );

    return ApiResponse.success(SuccessCode.OK, null);
  }
}
