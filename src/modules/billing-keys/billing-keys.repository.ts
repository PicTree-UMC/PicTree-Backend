import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BillingKeyStatus } from './billing-keys.constant';
import {
  BillingKeyRecord,
  CreateBillingKeyData,
  FindOrCreateBillingKeyResult,
} from './billing-keys.types';

@Injectable()
export class BillingKeysRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOrCreateActiveBillingKey = (
    createBillingKeyData: CreateBillingKeyData,
  ): Promise<FindOrCreateBillingKeyResult> => {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id
        FROM users
        WHERE id = ${BigInt(createBillingKeyData.userId)}
        FOR UPDATE
      `;

      const existingBillingKey = await tx.billingKey.findFirst({
        where: {
          userId: BigInt(createBillingKeyData.userId),
          paymentProvider: createBillingKeyData.paymentProvider,
          cardCompany: createBillingKeyData.cardCompany,
          cardNumberMasked: createBillingKeyData.cardNumberMasked,
          status: BillingKeyStatus.ACTIVE,
        },
      });

      if (existingBillingKey) {
        return {
          billingKey: existingBillingKey,
          created: false,
        };
      }

      const billingKey = await tx.billingKey.create({
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

      return {
        billingKey,
        created: true,
      };
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
