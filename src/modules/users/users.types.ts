export interface UserRecord {
  id: bigint;
  email: string | null;
  nickname: string;
  profileImageUrl: string | null;
  role: string;
  status: string;
  notification: boolean;
  createdAt: Date;
  updatedAt: Date;
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
