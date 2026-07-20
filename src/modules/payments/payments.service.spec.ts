import { AppException } from '../../common/exceptions/app.exception';
import { ConfirmPaymentRequestDto } from './dto/confirm-payment-request.dto';
import { PaymentStatus } from './payments.constant';
import { PaymentsRepository } from './payments.repository';
import { PaymentsService } from './payments.service';
import { PaymentRecord } from './payments.types';
import {
  TossPaymentRejectedError,
  TossPaymentResultUnknownError,
} from './toss-payments.exception';
import { TossPaymentsService } from './toss-payments.service';
import { TossPaymentConfirmResult } from './toss-payments.types';

describe('PaymentsService', () => {
  const paymentRequest: ConfirmPaymentRequestDto = {
    paymentKey: 'payment-key',
    orderId: 'ORDER_1_test',
    amount: 2900,
  };
  const readyPayment = createPaymentRecord(PaymentStatus.READY);
  const doneTossPayment = createTossPayment(PaymentStatus.DONE);

  let paymentsRepository: jest.Mocked<PaymentsRepository>;
  let tossPaymentsService: jest.Mocked<TossPaymentsService>;
  let paymentsService: PaymentsService;

  beforeEach(() => {
    paymentsRepository = {
      findPaymentByOrderId: jest.fn(),
      findPaymentByIdAndUserId: jest.fn(),
      failPayment: jest.fn(),
      updatePaymentAfterConfirm: jest.fn(),
      updatePaymentAfterCancel: jest.fn(),
    } as unknown as jest.Mocked<PaymentsRepository>;
    tossPaymentsService = {
      confirmPayment: jest.fn(),
      cancelPayment: jest.fn(),
      getPaymentForReconciliation: jest.fn(),
    } as unknown as jest.Mocked<TossPaymentsService>;
    paymentsService = new PaymentsService(
      paymentsRepository,
      tossPaymentsService,
    );

    paymentsRepository.findPaymentByOrderId.mockResolvedValue(readyPayment);
  });

  it('명시적인 승인 거절만 FAILED로 전이한다', async () => {
    tossPaymentsService.confirmPayment.mockRejectedValue(
      new TossPaymentRejectedError(),
    );
    paymentsRepository.failPayment.mockResolvedValue({ count: 1 });

    await expect(
      paymentsService.confirmPayment(1, paymentRequest),
    ).rejects.toBeInstanceOf(AppException);

    expect(paymentsRepository.failPayment).toHaveBeenCalledWith(
      readyPayment.id,
      paymentRequest.paymentKey,
      expect.any(Date),
    );
    expect(
      tossPaymentsService.getPaymentForReconciliation,
    ).not.toHaveBeenCalled();
  });

  it('결과가 불확실하면 FAILED로 전이하지 않는다', async () => {
    tossPaymentsService.confirmPayment.mockRejectedValue(
      new TossPaymentResultUnknownError(),
    );
    tossPaymentsService.getPaymentForReconciliation.mockRejectedValue(
      new TossPaymentResultUnknownError(),
    );

    await expect(
      paymentsService.confirmPayment(1, paymentRequest),
    ).rejects.toBeInstanceOf(AppException);

    expect(paymentsRepository.failPayment).not.toHaveBeenCalled();
    expect(paymentsRepository.updatePaymentAfterConfirm).not.toHaveBeenCalled();
  });

  it('승인 후 저장에 실패하면 토스 결제를 조회하고 다시 저장한다', async () => {
    const donePayment = createPaymentRecord(PaymentStatus.DONE);

    tossPaymentsService.confirmPayment.mockResolvedValue(doneTossPayment);
    tossPaymentsService.getPaymentForReconciliation.mockResolvedValue(
      doneTossPayment,
    );
    paymentsRepository.updatePaymentAfterConfirm
      .mockRejectedValueOnce(new Error('temporary database error'))
      .mockResolvedValueOnce(donePayment);

    const result = await paymentsService.confirmPayment(1, paymentRequest);

    expect(
      tossPaymentsService.getPaymentForReconciliation,
    ).toHaveBeenCalledWith(paymentRequest.orderId, paymentRequest.paymentKey);
    expect(paymentsRepository.updatePaymentAfterConfirm).toHaveBeenCalledTimes(
      2,
    );
    expect(result.status).toBe(PaymentStatus.DONE);
  });

  it('입금 대기 결제는 paidAt 없이 저장한다', async () => {
    const waitingTossPayment = createTossPayment(
      PaymentStatus.WAITING_FOR_DEPOSIT,
    );
    const waitingPayment = createPaymentRecord(
      PaymentStatus.WAITING_FOR_DEPOSIT,
    );

    tossPaymentsService.confirmPayment.mockResolvedValue(waitingTossPayment);
    paymentsRepository.updatePaymentAfterConfirm.mockResolvedValue(
      waitingPayment,
    );

    await paymentsService.confirmPayment(1, paymentRequest);

    expect(paymentsRepository.updatePaymentAfterConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        status: PaymentStatus.WAITING_FOR_DEPOSIT,
        paidAt: null,
      }),
    );
  });

  describe('cancelPayment', () => {
    const cancelRequest = {
      cancelReason: '사용자 요청으로 인한 결제 취소',
    };

    it('완료된 결제를 전액 취소한다', async () => {
      const donePayment = createPaymentRecord(PaymentStatus.DONE);
      const canceledPayment = createPaymentRecord(PaymentStatus.CANCELED);
      const canceledTossPayment = createTossPayment(PaymentStatus.CANCELED);

      paymentsRepository.findPaymentByIdAndUserId.mockResolvedValue(
        donePayment,
      );
      tossPaymentsService.cancelPayment.mockResolvedValue(canceledTossPayment);
      paymentsRepository.updatePaymentAfterCancel.mockResolvedValue(
        canceledPayment,
      );

      const result = await paymentsService.cancelPayment(1, 1, cancelRequest);

      expect(tossPaymentsService.cancelPayment).toHaveBeenCalledWith(
        'payment-key',
        cancelRequest.cancelReason,
        'CANCEL_PAYMENT_1',
      );
      expect(result.status).toBe(PaymentStatus.CANCELED);
    });

    it('이미 취소된 결제는 토스에 중복 요청하지 않는다', async () => {
      const canceledPayment = createPaymentRecord(PaymentStatus.CANCELED);

      paymentsRepository.findPaymentByIdAndUserId.mockResolvedValue(
        canceledPayment,
      );

      const result = await paymentsService.cancelPayment(1, 1, cancelRequest);

      expect(tossPaymentsService.cancelPayment).not.toHaveBeenCalled();
      expect(result.status).toBe(PaymentStatus.CANCELED);
    });

    it('완료 상태가 아닌 결제는 취소하지 않는다', async () => {
      paymentsRepository.findPaymentByIdAndUserId.mockResolvedValue(
        readyPayment,
      );

      await expect(
        paymentsService.cancelPayment(1, 1, cancelRequest),
      ).rejects.toBeInstanceOf(AppException);

      expect(tossPaymentsService.cancelPayment).not.toHaveBeenCalled();
    });

    it('취소 결과가 불확실하면 토스 조회 결과로 복구한다', async () => {
      const donePayment = createPaymentRecord(PaymentStatus.DONE);
      const canceledPayment = createPaymentRecord(PaymentStatus.CANCELED);
      const canceledTossPayment = createTossPayment(PaymentStatus.CANCELED);

      paymentsRepository.findPaymentByIdAndUserId.mockResolvedValue(
        donePayment,
      );
      tossPaymentsService.cancelPayment.mockRejectedValue(
        new TossPaymentResultUnknownError(),
      );
      tossPaymentsService.getPaymentForReconciliation.mockResolvedValue(
        canceledTossPayment,
      );
      paymentsRepository.updatePaymentAfterCancel.mockResolvedValue(
        canceledPayment,
      );

      const result = await paymentsService.cancelPayment(1, 1, cancelRequest);

      expect(
        tossPaymentsService.getPaymentForReconciliation,
      ).toHaveBeenCalledWith(donePayment.orderId, 'payment-key');
      expect(result.status).toBe(PaymentStatus.CANCELED);
    });

    it('취소 후 저장에 실패하면 토스 조회 후 다시 저장한다', async () => {
      const donePayment = createPaymentRecord(PaymentStatus.DONE);
      const canceledPayment = createPaymentRecord(PaymentStatus.CANCELED);
      const canceledTossPayment = createTossPayment(PaymentStatus.CANCELED);

      paymentsRepository.findPaymentByIdAndUserId.mockResolvedValue(
        donePayment,
      );
      tossPaymentsService.cancelPayment.mockResolvedValue(canceledTossPayment);
      tossPaymentsService.getPaymentForReconciliation.mockResolvedValue(
        canceledTossPayment,
      );
      paymentsRepository.updatePaymentAfterCancel
        .mockRejectedValueOnce(new Error('temporary database error'))
        .mockResolvedValueOnce(canceledPayment);

      const result = await paymentsService.cancelPayment(1, 1, cancelRequest);

      expect(
        tossPaymentsService.getPaymentForReconciliation,
      ).toHaveBeenCalledWith(donePayment.orderId, 'payment-key');
      expect(paymentsRepository.updatePaymentAfterCancel).toHaveBeenCalledTimes(
        2,
      );
      expect(result.status).toBe(PaymentStatus.CANCELED);
    });
  });
});

function createPaymentRecord(status: string): PaymentRecord {
  return {
    id: 1n,
    userId: 1n,
    usersSubscriptionId: null,
    billingKeyId: null,
    orderId: 'ORDER_1_test',
    orderName: '플러스 플랜',
    amount: 2900,
    paymentMethod: status === PaymentStatus.READY ? null : '카드',
    paymentProvider: 'TOSS',
    providerPaymentId: status === PaymentStatus.READY ? null : 'payment-key',
    status,
    paidAt: status === PaymentStatus.DONE ? new Date() : null,
    failedAt: null,
    canceledAt: status === PaymentStatus.CANCELED ? new Date() : null,
    createdAt: new Date(),
    updatedAt: new Date(),
    receipt: null,
  };
}

function createTossPayment(status: string): TossPaymentConfirmResult {
  return {
    paymentKey: 'payment-key',
    orderId: 'ORDER_1_test',
    status,
    method: status === PaymentStatus.WAITING_FOR_DEPOSIT ? '가상계좌' : '카드',
    approvedAt:
      status === PaymentStatus.DONE ? '2026-07-18T01:00:00+09:00' : null,
    receipt: null,
    cancels:
      status === PaymentStatus.CANCELED
        ? [
            {
              cancelAmount: 2900,
              canceledAt: '2026-07-20T10:00:00+09:00',
              cancelStatus: PaymentStatus.DONE,
            },
          ]
        : null,
  } as TossPaymentConfirmResult;
}
