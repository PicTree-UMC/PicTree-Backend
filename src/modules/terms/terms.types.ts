import { Prisma } from '@prisma/client';

export type TermRecord = Prisma.TermGetPayload<Record<string, never>>;

export type TermsUserRecord = {
  id: bigint;
  status: string;
};
