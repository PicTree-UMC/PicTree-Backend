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
  imageUrl: string;
  sortOrder: number;
}

export interface TreeWithImagesRecord extends TreeRecord {
  images: TreeImageRecord[];
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
