import { TimelineCategory } from '@prisma/client';

export interface BlogDraftRecord {
  id: bigint;
  userId: bigint;
  title: string;
  content: string;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BlogDraftSummaryRecord {
  id: bigint;
  title: string;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
}

export interface BlogDraftUserRecord {
  id: bigint;
  status: string;
  currentSubscription: {
    startedAt: Date;
    expiresAt: Date;
    subscriptionPlan: {
      code: string;
    };
  } | null;
}

export interface BlogDraftSourceTreeImageRecord {
  id: bigint;
  imageUrl: string;
  s3Key: string;
  sortOrder: number;
}

export interface BlogDraftSourceTreeRecord {
  id: bigint;
  name: string;
  description: string | null;
  address: string | null;
  mood: string;
  defaultImage: string;
  createdAt: Date;
  images: BlogDraftSourceTreeImageRecord[];
}

export interface BlogDraftSourceTimelineRecord {
  id: bigint;
  title: string;
  content: string | null;
  category: TimelineCategory;
  visitedAt: Date;
  tree: {
    id: bigint;
    name: string;
  } | null;
}

export interface BlogDraftGenerateSource {
  trees: BlogDraftSourceTreeRecord[];
  timelines: BlogDraftSourceTimelineRecord[];
}

export interface CreateBlogDraftData {
  userId: number;
  title: string;
  content: string;
  startDate: Date;
  endDate: Date;
}

export interface OpenAiGeneratedDraft {
  title: string;
  content: string;
}

export type BlogDraftImagePart = {
  type: 'input_image';
  image_url: string;
};

export interface BlogDraftSourceImageForPrompt {
  imageUrl: string;
  caption: string;
}
