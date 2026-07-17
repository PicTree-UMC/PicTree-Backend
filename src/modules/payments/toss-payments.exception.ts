export class TossPaymentRejectedError extends Error {
  constructor() {
    super('Toss Payments explicitly rejected the payment request.');
    this.name = TossPaymentRejectedError.name;
  }
}

export class TossPaymentResultUnknownError extends Error {
  constructor() {
    super('The Toss Payments result could not be determined.');
    this.name = TossPaymentResultUnknownError.name;
  }
}
