import { Prisma } from '@prisma/client';

export interface RouteRecord {
  id: bigint;
  userId: bigint;
  routeName: string;
  totalDistanceM: number | null;
  startedAt: Date;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoutePointRecord {
  latitude: Prisma.Decimal;
  longitude: Prisma.Decimal;
  sequence: number;
}

export interface RouteWithPointsRecord extends RouteRecord {
  points: RoutePointRecord[];
}

export interface CreateRoutePointData {
  latitude: number;
  longitude: number;
  sequence: number;
  recordedAt: Date;
}

export interface CreateRouteData {
  userId: number;
  routeName: string;
  totalDistanceM: number | null;
  startedAt: Date;
  endedAt: Date | null;
  points: CreateRoutePointData[];
}

export interface UpdateRouteData {
  routeName?: string;
}
