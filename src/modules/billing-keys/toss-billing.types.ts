export type TossBillingCard = {
  issuerCode: string | null;
  number: string;
};

export type TossBillingKeyResponse = {
  billingKey: string;
  customerKey: string;
  authenticatedAt: string;
  method: string;
  card: TossBillingCard;
};
