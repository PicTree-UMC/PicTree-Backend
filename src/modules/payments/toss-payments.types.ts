import { PaymentStatusType } from './payments.constant';

export type TossPaymentCancelRecord = {
  cancelAmount: number;
  canceledAt: string;
  cancelStatus: string;
};

export type TossPaymentResponse = {
  paymentKey: string;
  orderId: string;
  totalAmount: number;
  status: string;
  method: string | null;
  approvedAt: string | null;
  receipt: {
    url?: string;
  } | null;
  cancels?: TossPaymentCancelRecord[] | null;
};

export type TossPaymentConfirmResult = Omit<TossPaymentResponse, 'status'> & {
  status: PaymentStatusType;
};

export type TossBillingPaymentRequest = {
  amount: number;
  customerKey: string;
  orderId: string;
  orderName: string;
  customerEmail?: string;
  customerName?: string;
};
