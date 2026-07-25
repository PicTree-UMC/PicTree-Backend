export interface PushSubscriptionRecord {
  id: bigint;
  userId: bigint;
  endpoint: string;
  endpointHash: string;
  p256dhKey: string;
  authKey: string;
  userAgent: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertPushSubscriptionData {
  userId: bigint;
  endpoint: string;
  endpointHash: string;
  p256dhKey: string;
  authKey: string;
  userAgent: string | null;
}
