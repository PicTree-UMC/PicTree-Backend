export const RoutePagination = {
  MIN_PAGE: 1,
  DEFAULT_PAGE: 1,
  MIN_SIZE: 1,
  DEFAULT_SIZE: 20,
  MAX_SIZE: 100,
} as const;

// 동선은 노드(나무)가 최소 1개 이상 있어야 한다
export const ROUTE_POINT_MIN_COUNT = 1;

// 한 동선의 최대 노드 수 (기획: 장소 20개 제한)
export const ROUTE_POINT_MAX_COUNT = 20;

// 한 동선이 묶을 수 있는 최대 날짜 수 (기획: 최대 3일)
export const ROUTE_MAX_DATE_SPAN = 3;
