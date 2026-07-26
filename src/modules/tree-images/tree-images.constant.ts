// 허용 이미지 MIME 타입
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

// MIME 타입별 확장자
export const MIME_TYPE_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

// 파일 1개 최대 크기 (10MB)
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

// 한 번에 업로드 가능한 최대 개수
export const MAX_IMAGE_COUNT = 10;

// S3 객체 키 접두사
export const TREE_IMAGE_KEY_PREFIX = 'trees';
