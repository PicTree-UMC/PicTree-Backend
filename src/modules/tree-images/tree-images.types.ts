export interface TreeImageRecord {
  id: bigint;
  treeId: bigint;
  timelineRecordId: bigint | null;
  imageUrl: string;
  s3Key: string;
  fileSize: bigint;
  sortOrder: number;
  createdAt: Date;
}

export interface CreateTreeImageData {
  treeId: number;
  timelineRecordId: number | null;
  imageUrl: string;
  s3Key: string;
  fileSize: number;
}

// 나무 소유권 검증에 필요한 최소 정보
export interface TreeOwnerRecord {
  id: bigint;
  userId: bigint;
}
