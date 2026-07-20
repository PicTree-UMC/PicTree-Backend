import { BillingKey } from '@prisma/client';

export type BillingKeyRecord = BillingKey;

export type CreateBillingKeyData = {
  userId: number;
  paymentProvider: string;
  billingKey: string;
  customerKey: string;
  cardCompany: string | null;
  cardNumberMasked: string;
  status: string;
  issuedAt: Date;
};

export type FindOrCreateBillingKeyResult = {
  billingKey: BillingKeyRecord;
  created: boolean;
};
