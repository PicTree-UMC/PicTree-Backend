import { Prisma } from '@prisma/client';

export interface TreeRecord {
  id: bigint;
  userId: bigint;
  name: string;
  description: string | null;
  latitude: Prisma.Decimal;
  longitude: Prisma.Decimal;
  address: string | null;
  isFavorite: boolean;
  mood: string;
  defaultImage: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TreeImageRecord {
  id: bigint;
  timelineRecordId: bigint | null;
  // 조회 응답에는 presigned URL 을 내려주므로 s3Key 가 필요하다.
  s3Key: string;
}

export interface TreeWithImagesRecord extends TreeRecord {
  images: TreeImageRecord[];
}

// 목록 조회용: 나무 + 대표 사진(0~1장)
export interface TreeListItemRecord extends TreeRecord {
  images: { s3Key: string }[];
}

export interface NearbyTreeRecord {
  id: bigint;
  name: string;
  latitude: Prisma.Decimal;
  longitude: Prisma.Decimal;
  mood: string;
  defaultImage: string;
  distanceM: number;
}

export interface FavoriteTreeRecord {
  id: bigint;
  name: string;
  description: string | null;
  createdAt: Date;
  image: TreeImageRecord | null;
}

export interface CreateTreeData {
  userId: number;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  mood: string;
  defaultImage: string;
}

export interface UpdateTreeData {
  name?: string;
  description?: string | null;
  address?: string | null;
  mood?: string;
  defaultImage?: string;
}
