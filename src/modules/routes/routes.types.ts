import { Prisma } from '@prisma/client';

export interface RouteRecord {
  id: bigint;
  userId: bigint;
  routeName: string;
  createdAt: Date;
  updatedAt: Date;
}

// 목록 조회용: 동선 + 장소(카드 표시용) 정보
export interface RouteListItemRecord extends RouteRecord {
  points: {
    sequence: number;
    tree: {
      name: string;
      mood: string;
      createdAt: Date;
      deletedAt: Date | null;
    };
  }[];
}

// 동선 노드 = 나무 참조 + 응답에 필요한 나무 정보
export interface RoutePointWithTreeRecord {
  sequence: number;
  tree: {
    id: bigint;
    name: string;
    mood: string;
    description: string | null;
    latitude: Prisma.Decimal;
    longitude: Prisma.Decimal;
    createdAt: Date;
    deletedAt: Date | null;
  };
}

export interface RouteWithPointsRecord extends RouteRecord {
  points: RoutePointWithTreeRecord[];
}

// 동선 사진 앨범용: 노드의 나무 + 대표 사진(0~1장)
export interface RoutePointImageRecord {
  tree: {
    id: bigint;
    name: string;
    deletedAt: Date | null;
    images: { s3Key: string }[];
  };
}

export interface CreateRoutePointData {
  treeId: number;
  sequence: number;
}

export interface CreateRouteData {
  userId: number;
  routeName: string;
  points: CreateRoutePointData[];
}

export interface UpdateRouteData {
  routeName?: string;
}
