import { Global, Module } from '@nestjs/common';
import { S3Service } from './s3.service';

// S3Service 를 여러 도메인에서 재사용할 수 있도록 전역 모듈로 제공한다.
@Global()
@Module({
  providers: [S3Service],
  exports: [S3Service],
})
export class S3Module {}
