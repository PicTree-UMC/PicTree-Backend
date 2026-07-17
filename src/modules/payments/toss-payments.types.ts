import { PaymentStatusType } from './payments.constant';

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

export type TossPaymentConfirmResult = Omit<TossPaymentResponse, 'status'> & {
  status: PaymentStatusType;
};
