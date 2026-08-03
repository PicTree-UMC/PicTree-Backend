import { AppException } from '../../common/exceptions/app.exception';
import { S3Service } from '../../common/s3/s3.service';
import { TreeImagesRepository } from './tree-images.repository';
import { TreeImagesService } from './tree-images.service';
import { TreeImageRecord, TreeOwnerRecord } from './tree-images.types';

const catchAppError = async (
  promise: Promise<unknown>,
): Promise<AppException> => {
  try {
    await promise;
  } catch (error) {
    return error as AppException;
  }
  throw new Error('AppException 이 발생하지 않았습니다.');
};

const buildFile = (
  overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File =>
  ({
    fieldname: 'image',
    originalname: 'photo.jpg',
    mimetype: 'image/jpeg',
    size: 204800,
    buffer: Buffer.from('image-bytes'),
    ...overrides,
  }) as Express.Multer.File;

describe('TreeImagesService', () => {
  const owner: TreeOwnerRecord = { id: 1n, userId: 10n };

  const imageRecord: TreeImageRecord = {
    id: 100n,
    treeId: 1n,
    timelineRecordId: null,
    imageUrl: 'https://bucket.s3.amazonaws.com/trees/1/new.jpg',
    s3Key: 'trees/1/new.jpg',
    fileSize: 204800n,
    sortOrder: 0,
    createdAt: new Date('2026-03-30T10:00:00.000Z'),
  };

  let repository: jest.Mocked<TreeImagesRepository>;
  let s3Service: jest.Mocked<S3Service>;
  let service: TreeImagesService;

  beforeEach(() => {
    repository = {
      findTreeById: jest.fn(),
      findByTreeAndTimeline: jest.fn(),
      replace: jest.fn(),
      findByTreeId: jest.fn(),
      findByIdAndTreeId: jest.fn(),
      deleteById: jest.fn(),
    } as unknown as jest.Mocked<TreeImagesRepository>;

    s3Service = {
      upload: jest.fn(),
      delete: jest.fn(),
      getPresignedUrl: jest.fn(),
    } as unknown as jest.Mocked<S3Service>;

    // S3 기본 동작: 업로드/삭제 성공, presigned 발급
    s3Service.upload.mockResolvedValue(
      'https://bucket.s3.amazonaws.com/trees/1/new.jpg',
    );
    s3Service.delete.mockResolvedValue(undefined);
    s3Service.getPresignedUrl.mockResolvedValue('https://signed-url');
    repository.replace.mockResolvedValue(imageRecord);

    service = new TreeImagesService(repository, s3Service);
  });

  describe('uploadImage', () => {
    it('존재하지 않는 나무면 TREE404 를 던진다', async () => {
      repository.findTreeById.mockResolvedValue(null);

      const error = await catchAppError(
        service.uploadImage(10, 1, buildFile()),
      );

      expect(error.getResponse()).toMatchObject({ code: 'TREE404' });
    });

    it('타인의 나무면 TREE403 을 던진다', async () => {
      repository.findTreeById.mockResolvedValue({ ...owner, userId: 99n });

      const error = await catchAppError(
        service.uploadImage(10, 1, buildFile()),
      );

      expect(error.getResponse()).toMatchObject({ code: 'TREE403' });
    });

    it('파일이 없으면 TREE_IMAGE400 을 던진다', async () => {
      repository.findTreeById.mockResolvedValue(owner);

      const error = await catchAppError(service.uploadImage(10, 1, undefined));

      expect(error.getResponse()).toMatchObject({ code: 'TREE_IMAGE400' });
    });

    it('지원하지 않는 형식이면 TREE_IMAGE415 를 던진다', async () => {
      repository.findTreeById.mockResolvedValue(owner);

      const error = await catchAppError(
        service.uploadImage(10, 1, buildFile({ mimetype: 'image/gif' })),
      );

      expect(error.getResponse()).toMatchObject({ code: 'TREE_IMAGE415' });
    });

    it('기존 사진이 없으면 새로 저장하고 기존 S3 객체는 지우지 않는다', async () => {
      repository.findTreeById.mockResolvedValue(owner);
      repository.findByTreeAndTimeline.mockResolvedValue(null);

      const result = await service.uploadImage(10, 1, buildFile());

      // S3 키는 randomUUID 로 생성되므로 업로드에 넘어간 키와 저장 키가 같은지로 검증한다.
      const uploadedKey = s3Service.upload.mock.calls[0][0].key;
      expect(repository.replace).toHaveBeenCalledWith(
        null,
        expect.objectContaining({ treeId: 1, s3Key: uploadedKey }),
      );
      expect(s3Service.delete).not.toHaveBeenCalled();
      expect(result.image.imageId).toBe(100);
    });

    it('기존 사진이 있으면 교체 후 기존 S3 객체를 정리한다', async () => {
      repository.findTreeById.mockResolvedValue(owner);
      repository.findByTreeAndTimeline.mockResolvedValue({
        ...imageRecord,
        id: 50n,
        s3Key: 'trees/1/old.jpg',
      });

      await service.uploadImage(10, 1, buildFile());

      expect(repository.replace).toHaveBeenCalledWith(50n, expect.any(Object));
      expect(s3Service.delete).toHaveBeenCalledWith('trees/1/old.jpg');
    });

    it('DB 저장에 실패하면 새로 올린 S3 객체를 롤백한다', async () => {
      repository.findTreeById.mockResolvedValue(owner);
      repository.findByTreeAndTimeline.mockResolvedValue(null);
      repository.replace.mockRejectedValue(new Error('db error'));

      await expect(service.uploadImage(10, 1, buildFile())).rejects.toThrow(
        'db error',
      );
      // 롤백은 방금 업로드한 그 키를 지워야 한다.
      const uploadedKey = s3Service.upload.mock.calls[0][0].key;
      expect(s3Service.delete).toHaveBeenCalledWith(uploadedKey);
    });
  });

  describe('deleteImage', () => {
    it('사진이 없으면 TREE_IMAGE404 를 던진다', async () => {
      repository.findTreeById.mockResolvedValue(owner);
      repository.findByIdAndTreeId.mockResolvedValue(null);

      const error = await catchAppError(service.deleteImage(10, 1, 100));

      expect(error.getResponse()).toMatchObject({ code: 'TREE_IMAGE404' });
    });

    it('S3 객체를 먼저 지운 뒤 DB 레코드를 삭제한다', async () => {
      repository.findTreeById.mockResolvedValue(owner);
      repository.findByIdAndTreeId.mockResolvedValue(imageRecord);

      await service.deleteImage(10, 1, 100);

      expect(s3Service.delete).toHaveBeenCalledWith('trees/1/new.jpg');
      expect(repository.deleteById).toHaveBeenCalledWith(100);
      expect(s3Service.delete.mock.invocationCallOrder[0]).toBeLessThan(
        repository.deleteById.mock.invocationCallOrder[0],
      );
    });
  });

  describe('getImages', () => {
    it('나무 사진을 조회하고 presigned URL 로 변환한다', async () => {
      repository.findTreeById.mockResolvedValue(owner);
      repository.findByTreeId.mockResolvedValue([imageRecord]);

      const result = await service.getImages(10, 1);

      expect(repository.findByTreeId).toHaveBeenCalledWith(1);
      expect(result.images[0].imageUrl).toBe('https://signed-url');
      expect(result.images[0]).not.toHaveProperty('timelineRecordId');
    });
  });
});
