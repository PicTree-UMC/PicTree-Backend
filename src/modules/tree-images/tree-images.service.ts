import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code';
import { S3Service } from '../../common/s3/s3.service';
import { TreeImageListResponseDto } from './dto/tree-image-list-response.dto';
import { TreeImageResponseDto } from './dto/tree-image-response.dto';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MIME_TYPE_EXTENSION,
  TREE_IMAGE_KEY_PREFIX,
} from './tree-images.constant';
import { TreeImagesRepository } from './tree-images.repository';
import { CreateTreeImageData, TreeImageRecord } from './tree-images.types';

@Injectable()
export class TreeImagesService {
  constructor(
    private readonly treeImagesRepository: TreeImagesRepository,
    private readonly s3Service: S3Service,
  ) {}

  uploadImages = async (
    userId: number,
    treeId: number,
    files: Express.Multer.File[],
    timelineRecordId?: number,
  ): Promise<TreeImageListResponseDto> => {
    await this.ensureTreeOwnership(userId, treeId);

    if (!files || files.length === 0) {
      throw new AppException(ErrorCode.TREE_IMAGE_NO_FILE);
    }
    this.validateFileTypes(files);

    const startSortOrder =
      (await this.treeImagesRepository.findMaxSortOrder(treeId)) + 1;

    // S3 업로드가 성공한 객체만 추적해, DB 저장 전 실패 시 정리한다.
    const uploadedKeys: string[] = [];
    let created: TreeImageRecord[];
    try {
      const createData: CreateTreeImageData[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const key = this.buildKey(treeId, file.mimetype);
        const imageUrl = await this.s3Service.upload({
          key,
          body: file.buffer,
          contentType: file.mimetype,
        });
        uploadedKeys.push(key);
        createData.push({
          treeId,
          timelineRecordId: timelineRecordId ?? null,
          imageUrl,
          s3Key: key,
          fileSize: file.size,
          sortOrder: startSortOrder + i,
        });
      }

      created = await this.treeImagesRepository.createMany(createData);
    } catch (error) {
      // DB 저장 전 실패한 경우에만 업로드된 S3 객체를 되돌린다.
      await Promise.all(
        uploadedKeys.map((key) => this.s3Service.delete(key).catch(() => {})),
      );
      throw error;
    }

    // DB 저장까지 성공한 뒤에는 presigned 발급이 실패해도 데이터를 되돌리지 않는다.
    return { images: await this.toResponseDtos(created) };
  };

  getImages = async (
    userId: number,
    treeId: number,
    timelineRecordId?: number,
  ): Promise<TreeImageListResponseDto> => {
    await this.ensureTreeOwnership(userId, treeId);

    const images = await this.treeImagesRepository.findByTreeId(
      treeId,
      timelineRecordId,
    );

    return { images: await this.toResponseDtos(images) };
  };

  deleteImage = async (
    userId: number,
    treeId: number,
    imageId: number,
  ): Promise<null> => {
    await this.ensureTreeOwnership(userId, treeId);

    const image = await this.treeImagesRepository.findByIdAndTreeId(
      imageId,
      treeId,
    );
    if (!image) {
      throw new AppException(ErrorCode.TREE_IMAGE_NOT_FOUND);
    }

    // S3 객체를 먼저 지워, DB에는 없는데 S3에만 남는 고아 객체를 방지한다.
    // S3 삭제가 실패하면 DB 레코드는 유지되어 재시도할 수 있다.
    await this.s3Service.delete(image.s3Key);
    await this.treeImagesRepository.deleteById(imageId);

    return null;
  };

  private ensureTreeOwnership = async (
    userId: number,
    treeId: number,
  ): Promise<void> => {
    const tree = await this.treeImagesRepository.findTreeById(treeId);

    if (!tree) {
      throw new AppException(ErrorCode.TREE_NOT_FOUND);
    }
    if (Number(tree.userId) !== userId) {
      throw new AppException(ErrorCode.TREE_FORBIDDEN);
    }
  };

  private validateFileTypes = (files: Express.Multer.File[]): void => {
    const allowed = ALLOWED_IMAGE_MIME_TYPES as readonly string[];
    const hasInvalid = files.some((file) => !allowed.includes(file.mimetype));

    if (hasInvalid) {
      throw new AppException(ErrorCode.TREE_IMAGE_UNSUPPORTED_TYPE);
    }
  };

  private buildKey = (treeId: number, mimetype: string): string => {
    const ext = MIME_TYPE_EXTENSION[mimetype] ?? 'bin';

    return `${TREE_IMAGE_KEY_PREFIX}/${treeId}/${randomUUID()}.${ext}`;
  };

  private toResponseDtos = (
    images: TreeImageRecord[],
  ): Promise<TreeImageResponseDto[]> => {
    return Promise.all(
      images.map(async (image) => ({
        imageId: Number(image.id),
        imageUrl: await this.s3Service.getPresignedUrl(image.s3Key),
        timelineRecordId:
          image.timelineRecordId === null
            ? null
            : Number(image.timelineRecordId),
        fileSize: Number(image.fileSize),
        sortOrder: image.sortOrder,
      })),
    );
  };
}
