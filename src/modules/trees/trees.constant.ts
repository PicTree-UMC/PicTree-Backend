// 나무 기본 이미지 식별자 (화면에서 선택하지 않을 때 서버가 부여)
export const DEFAULT_TREE_IMAGE = 'DEFAULT_1';

// 무료 플랜 식별 코드 (subscription_plans.code 기준)
export const FREE_PLAN_CODE = 'FREE';

// 나무 N개 등록마다 광고 노출
export const AD_INTERVAL = 2;

export const TreePagination = {
  MIN_PAGE: 1,
  DEFAULT_PAGE: 1,
  MIN_SIZE: 1,
  DEFAULT_SIZE: 20,
  MAX_SIZE: 100,
} as const;
