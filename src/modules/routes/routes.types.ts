import { Prisma } from '@prisma/client';

export interface RouteRecord {
  id: bigint;
  userId: bigint;
  routeName: string;
  createdAt: Date;
  updatedAt: Date;
}

// 목록 조회용: 동선 + 장소 개수
export interface RouteWithCountRecord extends RouteRecord {
  _count: { points: number };
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
    deletedAt: Date | null;
  };
}

export interface RouteWithPointsRecord extends RouteRecord {
  points: RoutePointWithTreeRecord[];
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
