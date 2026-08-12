export class TossBillingRejectedError extends Error {
  constructor() {
    super('Toss Payments explicitly rejected the billing request.');
    this.name = TossBillingRejectedError.name;
  }
}

export class TossBillingResultUnknownError extends Error {
  constructor() {
    super('The Toss Payments billing result could not be determined.');
    this.name = TossBillingResultUnknownError.name;
  }
}
