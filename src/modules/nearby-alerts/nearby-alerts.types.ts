import { NearbyAlertStatus } from '@prisma/client';

export interface NearbyAlertLogRecord {
  id: bigint;
  userId: bigint;
  treeId: bigint;
  distanceM: number;
  alertDate: Date;
  status: NearbyAlertStatus;
  sentAt: Date | null;
  openedAt: Date | null;
  deletedAt: Date | null;
  tree: {
    name: string;
    defaultImage: string;
  };
}

export interface PushPayload {
  title: string;
  body: string;
  data: {
    url: string;
    treeId: number;
    alertLogId: number;
  };
}
