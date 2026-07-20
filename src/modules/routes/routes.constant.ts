export const RoutePagination = {
  MIN_PAGE: 1,
  DEFAULT_PAGE: 1,
  MIN_SIZE: 1,
  DEFAULT_SIZE: 20,
  MAX_SIZE: 100,
} as const;

// 동선은 좌표가 최소 1개 이상 있어야 한다
export const ROUTE_POINT_MIN_COUNT = 1;
