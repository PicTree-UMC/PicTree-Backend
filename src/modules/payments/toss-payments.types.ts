export type TossPaymentResponse = {
  paymentKey: string;
  orderId: string;
  status: string;
  method: string | null;
  approvedAt: string | null;
  receipt: {
    url?: string;
  } | null;
};
