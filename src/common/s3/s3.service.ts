import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AppException } from '../exceptions/app.exception';
import { ErrorCode } from '../exceptions/error-code';

// presigned 조회 URL 유효 시간(초). 24시간.
// 화면을 오래 열어둔 뒤에도 이미지가 보이도록 하루로 잡는다.
// 만료된 경우에는 조회 API 를 다시 호출해 새 URL 을 발급받는다.
const PRESIGNED_URL_EXPIRES_IN = 60 * 60 * 24;

interface UploadParams {
  key: string;
  body: Buffer;
  contentType: string;
}

@Injectable()
export class S3Service implements OnModuleInit {
  private client!: S3Client;
  private bucket!: string;
  private region!: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const region = this.configService.get<string>('AWS_REGION');
    const bucket = this.configService.get<string>('AWS_S3_BUCKET');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );

    if (!region || !bucket || !accessKeyId || !secretAccessKey) {
      throw new AppException(ErrorCode.S3_CONFIG_MISSING);
    }

    this.region = region;
    this.bucket = bucket;
    this.client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  upload = async (uploadParams: UploadParams): Promise<string> => {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: uploadParams.key,
          Body: uploadParams.body,
          ContentType: uploadParams.contentType,
        }),
      );
    } catch {
      throw new AppException(ErrorCode.S3_UPLOAD_FAILED);
    }

    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${uploadParams.key}`;
  };

  delete = async (key: string): Promise<void> => {
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch {
      throw new AppException(ErrorCode.S3_DELETE_FAILED);
    }
  };

  // 비공개 버킷의 객체를 조회할 수 있는 임시 서명 URL을 발급한다.
  getPresignedUrl = (key: string): Promise<string> => {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: PRESIGNED_URL_EXPIRES_IN },
    );
  };
}
