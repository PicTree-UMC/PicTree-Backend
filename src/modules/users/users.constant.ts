export const UserStatus = {
  ACTIVE: 'ACTIVE',
  WITHDRAWN: 'WITHDRAWN',
  DELETED: 'DELETED',
} as const;

export const AccountRecoveryPolicy = {
  GRACE_PERIOD_MS: 30 * 24 * 60 * 60 * 1000,
  CLEANUP_INTERVAL_MS: 60 * 60 * 1000,
  CLEANUP_BATCH_SIZE: 100,
} as const;
