import { Prisma } from '@prisma/client';

export type TermRecord = Prisma.TermGetPayload<Record<string, never>>;
