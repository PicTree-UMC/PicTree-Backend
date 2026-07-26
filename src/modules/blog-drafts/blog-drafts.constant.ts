export const BLOG_DRAFT_LIMIT = {
  FREE: 1,
  PAID: 30,
} as const;

export const BLOG_DRAFT_STATUS = {
  GENERATED: 'GENERATED',
  SAVED: 'SAVED',
} as const;

export const BLOG_DRAFT_MODEL = 'gpt-5.6-luna';

export const BLOG_DRAFT_MAX_IMAGE_COUNT = 6;
