import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code';
import { S3Service } from '../../common/s3/s3.service';
import { TreeImageListResponseDto } from './dto/tree-image-list-response.dto';
import { TreeImageResponseDto } from './dto/tree-image-response.dto';
import { TreeImageUploadResponseDto } from './dto/tree-image-upload-response.dto';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MIME_TYPE_EXTENSION,
  TREE_IMAGE_KEY_PREFIX,
} from './tree-images.constant';
import { TreeImagesRepository } from './tree-images.repository';
import { TreeImageRecord } from './tree-images.types';

@Injectable()
export class TreeImagesService {
  constructor(
    private readonly treeImagesRepository: TreeImagesRepository,
    private readonly s3Service: S3Service,
  ) {}

  // 나무(또는 타임라인 기록)당 사진은 1장이다. 이미 있으면 교체한다.
  // 사진의 날짜는 항상 나무 등록 시점(Tree.createdAt) 기준이며, 교체해도 변하지 않는다.
  uploadImage = async (
    userId: number,
    treeId: number,
    file: Express.Multer.File,
    timelineRecordId?: number,
  ): Promise<TreeImageUploadResponseDto> => {
    await this.ensureTreeOwnership(userId, treeId);

    if (!file) {
      throw new AppException(ErrorCode.TREE_IMAGE_NO_FILE);
    }
    this.validateFileType(file);

    const normalizedTimelineRecordId = timelineRecordId ?? null;
    const existing = await this.treeImagesRepository.findByTreeAndTimeline(
      treeId,
      normalizedTimelineRecordId,
    );

    const key = this.buildKey(treeId, file.mimetype);
    const imageUrl = await this.s3Service.upload({
      key,
      body: file.buffer,
      contentType: file.mimetype,
    });

    let created: TreeImageRecord;
    try {
      created = await this.treeImagesRepository.replace(existing?.id ?? null, {
        treeId,
        timelineRecordId: normalizedTimelineRecordId,
        imageUrl,
        s3Key: key,
        fileSize: file.size,
      });
    } catch (error) {
      // DB 저장 전 실패한 경우, 방금 올린 새 S3 객체를 되돌린다.
      await this.s3Service.delete(key).catch(() => {});
      throw error;
    }

    // 교체 성공 후 기존 S3 객체를 정리한다. 실패해도 데이터엔 영향이 없다(고아 객체만 남음).
    if (existing) {
      await this.s3Service.delete(existing.s3Key).catch(() => {});
    }

    return { image: await this.toResponseDto(created) };
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

  private validateFileType = (file: Express.Multer.File): void => {
    const allowed = ALLOWED_IMAGE_MIME_TYPES as readonly string[];

    if (!allowed.includes(file.mimetype)) {
      throw new AppException(ErrorCode.TREE_IMAGE_UNSUPPORTED_TYPE);
    }
  };

  private buildKey = (treeId: number, mimetype: string): string => {
    const ext = MIME_TYPE_EXTENSION[mimetype] ?? 'bin';

    return `${TREE_IMAGE_KEY_PREFIX}/${treeId}/${randomUUID()}.${ext}`;
  };

  private toResponseDto = async (
    image: TreeImageRecord,
  ): Promise<TreeImageResponseDto> => ({
    imageId: Number(image.id),
    imageUrl: await this.s3Service.getPresignedUrl(image.s3Key),
    timelineRecordId:
      image.timelineRecordId === null ? null : Number(image.timelineRecordId),
    fileSize: Number(image.fileSize),
  });

  private toResponseDtos = (
    images: TreeImageRecord[],
  ): Promise<TreeImageResponseDto[]> => {
    return Promise.all(images.map((image) => this.toResponseDto(image)));
  };
}
