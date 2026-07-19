export const TreeMood = {
  HAPPY: 'HAPPY',
  SAD: 'SAD',
  NORMAL: 'NORMAL',
} as const;

export type TreeMoodType = (typeof TreeMood)[keyof typeof TreeMood];

// 무료 플랜 식별 코드 (subscription_plans.code 기준)
export const FREE_PLAN_CODE = 'FREE';

// 나무 N개 등록마다 광고 노출
export const AD_INTERVAL = 2;

export const TreePagination = {
  DEFAULT_PAGE: 1,
  DEFAULT_SIZE: 20,
  MAX_SIZE: 100,
} as const;

export const Coordinate = {
  MIN_LATITUDE: -90,
  MAX_LATITUDE: 90,
  MIN_LONGITUDE: -180,
  MAX_LONGITUDE: 180,
} as const;
