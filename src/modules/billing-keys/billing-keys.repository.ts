import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BillingKeyStatus } from './billing-keys.constant';
import { BillingKeyRecord, CreateBillingKeyData } from './billing-keys.types';

@Injectable()
export class BillingKeysRepository {
  constructor(private readonly prisma: PrismaService) {}

  createBillingKey = (
    createBillingKeyData: CreateBillingKeyData,
  ): Promise<BillingKeyRecord> => {
    return this.prisma.billingKey.create({
      data: {
        userId: BigInt(createBillingKeyData.userId),
        paymentProvider: createBillingKeyData.paymentProvider,
        billingKey: createBillingKeyData.billingKey,
        customerKey: createBillingKeyData.customerKey,
        cardCompany: createBillingKeyData.cardCompany,
        cardNumberMasked: createBillingKeyData.cardNumberMasked,
        status: createBillingKeyData.status,
        issuedAt: createBillingKeyData.issuedAt,
      },
    });
  };

  findActiveBillingKeysByUserId = (
    userId: number,
  ): Promise<BillingKeyRecord[]> => {
    return this.prisma.billingKey.findMany({
      where: {
        userId: BigInt(userId),
        status: BillingKeyStatus.ACTIVE,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  };

  findActiveBillingKeyByCard = (
    userId: number,
    paymentProvider: string,
    cardCompany: string | null,
    cardNumberMasked: string,
  ): Promise<BillingKeyRecord | null> => {
    return this.prisma.billingKey.findFirst({
      where: {
        userId: BigInt(userId),
        paymentProvider,
        cardCompany,
        cardNumberMasked,
        status: BillingKeyStatus.ACTIVE,
      },
    });
  };

  findBillingKeyByIdAndUserId = (
    billingKeyId: number,
    userId: number,
  ): Promise<BillingKeyRecord | null> => {
    return this.prisma.billingKey.findFirst({
      where: {
        id: BigInt(billingKeyId),
        userId: BigInt(userId),
      },
    });
  };

  deactivateBillingKey = (
    billingKeyId: bigint,
    deactivatedAt: Date,
  ): Promise<BillingKeyRecord> => {
    return this.prisma.$transaction(async (tx) => {
      await tx.billingKey.updateMany({
        where: {
          id: billingKeyId,
          status: BillingKeyStatus.ACTIVE,
        },
        data: {
          status: BillingKeyStatus.DEACTIVATED,
          deactivatedAt,
        },
      });

      return tx.billingKey.findUniqueOrThrow({
        where: {
          id: billingKeyId,
        },
      });
    });
  };
}
