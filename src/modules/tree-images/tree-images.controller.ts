import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseFilePipeBuilder,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../../common/responses/api.response';
import { SuccessCode } from '../../common/responses/success-code';
import { AccessTokenGuard } from '../auth/access-token.guard';
import type { JwtPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { GetTreeImagesQueryDto } from './dto/get-tree-images-query.dto';
import { TreeImageListResponseDto } from './dto/tree-image-list-response.dto';
import { UploadTreeImageRequestDto } from './dto/upload-tree-image-request.dto';
import { MAX_IMAGE_COUNT, MAX_IMAGE_SIZE_BYTES } from './tree-images.constant';
import {
  ApiDeleteTreeImage,
  ApiGetTreeImages,
  ApiUploadTreeImages,
} from './tree-images.swagger';
import { TreeImagesService } from './tree-images.service';

@ApiTags('Tree Images')
@Controller('trees/:treeId/images')
@UseGuards(AccessTokenGuard)
export class TreeImagesController {
  constructor(private readonly treeImagesService: TreeImagesService) {}

  @Post()
  @UseInterceptors(
    FilesInterceptor('images', MAX_IMAGE_COUNT, {
      // 파일이 메모리에 버퍼링되기 전에 크기를 제한한다.
      limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
    }),
  )
  @ApiUploadTreeImages()
  async uploadImages(
    @CurrentUser() currentUser: JwtPayload,
    @Param('treeId', ParseIntPipe) treeId: number,
    @UploadedFiles(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: MAX_IMAGE_SIZE_BYTES })
        .build({
          fileIsRequired: true,
          errorHttpStatusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        }),
    )
    files: Express.Multer.File[],
    // multipart 의 파일 외 필드는 body 로 전달됩니다.
    @Body() uploadTreeImageRequestDto: UploadTreeImageRequestDto,
  ): Promise<ApiResponse<TreeImageListResponseDto>> {
    const data = await this.treeImagesService.uploadImages(
      currentUser.userId,
      treeId,
      files,
      uploadTreeImageRequestDto.timelineRecordId,
    );

    return ApiResponse.success(SuccessCode.CREATED, data);
  }

  @Get()
  @ApiGetTreeImages()
  async getImages(
    @CurrentUser() currentUser: JwtPayload,
    @Param('treeId', ParseIntPipe) treeId: number,
    @Query() getTreeImagesQueryDto: GetTreeImagesQueryDto,
  ): Promise<ApiResponse<TreeImageListResponseDto>> {
    const data = await this.treeImagesService.getImages(
      currentUser.userId,
      treeId,
      getTreeImagesQueryDto.timelineRecordId,
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
