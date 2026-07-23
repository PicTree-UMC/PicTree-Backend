import { TimelineCategory } from '@prisma/client';

export interface TimelineTreeRecord {
  id: bigint;
  name: string;
  mood: string;
  defaultImage: string;
}

export interface TimelineRecordWithTree {
  id: bigint;
  userId: bigint;
  treeId: bigint | null;
  title: string;
  content: string | null;
  category: TimelineCategory;
  visitedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  tree: TimelineTreeRecord | null;
}

export interface CreateTimelineData {
  userId: bigint;
  treeId?: bigint | null;
  title: string;
  content?: string | null;
  category: TimelineCategory;
  visitedAt: Date;
}

export interface UpdateTimelineData {
  treeId?: bigint | null;
  title?: string;
  content?: string | null;
  category?: TimelineCategory;
  visitedAt?: Date;
}
