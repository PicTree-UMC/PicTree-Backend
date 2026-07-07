import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // API endpoint 앞에 api/v1 경로 붙여줌 (ex. api/users)
  app.setGlobalPrefix('api/v1');

  // CORS 설정
  app.enableCors({
    origin: ['http://localhost:5173'], // React 포트 허용
    credentials: true,
  });

  // DTO 기반 요청 데이터 검증
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO에 없는 필드가 들어오면 제거
      transform: true, // 요청 값을 DTO 타입에 맞게 변환
    }),
  );

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('PicTree API')
    .setDescription('PicTree API 문서입니다.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();