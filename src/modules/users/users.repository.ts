import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserStatus } from './users.constant';
import { UpdateUserData, UserRecord, WithdrawUserResult } from './users.types';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserById = (userId: number): Promise<UserRecord | null> => {
    return this.prisma.user.findUnique({
      where: {
        id: BigInt(userId),
      },
      include: {
        currentSubscription: {
          include: {
            subscriptionPlan: true,
          },
        },
      },
    });
  };

  updateUser = (
    userId: number,
    updateUserData: UpdateUserData,
  ): Promise<UserRecord> => {
    return this.prisma.user.update({
      where: {
        id: BigInt(userId),
      },
      data: updateUserData,
      include: {
        currentSubscription: {
          include: {
            subscriptionPlan: true,
          },
        },
      },
    });
  };

  withdrawUser = (
    userId: number,
    withdrawnAt: Date,
    scheduledDeletionAt: Date,
  ): Promise<WithdrawUserResult> => {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id
        FROM users
        WHERE id = ${BigInt(userId)}
        FOR UPDATE
      `;

      const user = await tx.user.findUnique({
        where: { id: BigInt(userId) },
        include: {
          currentSubscription: {
            include: { subscriptionPlan: true },
          },
        },
      });

      if (!user || user.status !== UserStatus.ACTIVE) {
        return { user, withdrawn: false };
      }

      if (user.currentSubscriptionId) {
        await tx.userSubscription.updateMany({
          where: {
            id: user.currentSubscriptionId,
            userId: user.id,
            autoRenew: true,
          },
          data: {
            autoRenew: false,
            canceledAt: withdrawnAt,
          },
        });
      }

      await tx.pushSubscription.updateMany({
        where: { userId: user.id, isActive: true },
        data: { isActive: false },
      });

      const withdrawnUser = await tx.user.update({
        where: { id: user.id },
        data: {
          status: UserStatus.WITHDRAWN,
          deletedAt: withdrawnAt,
          scheduledDeletionAt,
          tokenVersion: { increment: 1 },
        },
        include: {
          currentSubscription: {
            include: { subscriptionPlan: true },
          },
        },
      });

      return { user: withdrawnUser, withdrawn: true };
    });
  };
}
