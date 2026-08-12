export interface UserRecord {
  id: bigint;
  email: string | null;
  nickname: string;
  profileImageUrl: string | null;
  role: string;
  status: string;
  tokenVersion: number;
  notification: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  scheduledDeletionAt: Date | null;
  currentSubscription: {
    subscriptionPlan: {
      code: string;
    };
  } | null;
}

export interface UpdateUserData {
  nickname?: string;
  profileImageUrl?: string | null;
  notification?: boolean;
}

export interface WithdrawUserResult {
  user: UserRecord | null;
  withdrawn: boolean;
}
