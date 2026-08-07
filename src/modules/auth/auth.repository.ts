import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuthUserRecord,
  CreateSocialUserResult,
  SocialAccountWithUser,
  SocialProvider,
  SocialUserInfo,
  TokenUserRecord,
} from './auth.types';
import { BillingKeyStatus } from '../billing-keys/billing-keys.constant';
import { UserStatus } from '../users/users.constant';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserById = (userId: number): Promise<AuthUserRecord | null> => {
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

  findTokenUserById = (userId: number): Promise<TokenUserRecord | null> => {
    return this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: {
        status: true,
        tokenVersion: true,
      },
    });
  };

  findSocialAccountWithUser = (
    provider: SocialProvider,
    providerUserId: string,
  ): Promise<SocialAccountWithUser | null> => {
    return this.prisma.socialAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider,
          providerUserId,
        },
      },
      include: {
        user: {
          include: {
            currentSubscription: {
              include: {
                subscriptionPlan: true,
              },
            },
          },
        },
      },
    });
  };

  createUserWithSocialAccount = (
    socialUserInfo: SocialUserInfo,
    nickname: string,
  ): Promise<CreateSocialUserResult> => {
    return this.prisma
      .$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: socialUserInfo.email,
            nickname,
            profileImageUrl: socialUserInfo.profileImageUrl,
          },
          include: {
            currentSubscription: {
              include: {
                subscriptionPlan: true,
              },
            },
          },
        });

        await tx.socialAccount.create({
          data: {
            userId: user.id,
            provider: socialUserInfo.provider,
            providerUserId: socialUserInfo.providerUserId,
            providerEmail: socialUserInfo.email,
          },
        });

        return {
          user,
          isNewUser: true,
        };
      })
      .catch((error) =>
        this.findUserAfterSocialAccountConflict(error, socialUserInfo),
      );
  };

  recoverWithdrawnUser = (
    userId: bigint,
    recoveredAt: Date,
  ): Promise<AuthUserRecord | null> => {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id
        FROM users
        WHERE id = ${userId}
        FOR UPDATE
      `;

      const user = await tx.user.findUnique({
        where: { id: userId },
        include: {
          currentSubscription: {
            include: { subscriptionPlan: true },
          },
        },
      });

      if (
        !user ||
        user.status !== UserStatus.WITHDRAWN ||
        !user.scheduledDeletionAt ||
        user.scheduledDeletionAt <= recoveredAt
      ) {
        return null;
      }

      return tx.user.update({
        where: { id: userId },
        data: {
          status: UserStatus.ACTIVE,
          deletedAt: null,
          scheduledDeletionAt: null,
          tokenVersion: { increment: 1 },
        },
        include: {
          currentSubscription: {
            include: { subscriptionPlan: true },
          },
        },
      });
    });
  };

  findExpiredWithdrawnUserIds = async (
    now: Date,
    take: number,
    afterUserId?: bigint,
  ): Promise<bigint[]> => {
    const users = await this.prisma.user.findMany({
      where: {
        status: UserStatus.WITHDRAWN,
        scheduledDeletionAt: { lte: now },
        ...(afterUserId === undefined ? {} : { id: { gt: afterUserId } }),
      },
      select: { id: true },
      orderBy: { id: 'asc' },
      take,
    });

    return users.map((user) => user.id);
  };

  finalizeExpiredWithdrawnUser = (
    userId: bigint,
    finalizedAt: Date,
  ): Promise<boolean> => {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id
        FROM users
        WHERE id = ${userId}
        FOR UPDATE
      `;

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          status: true,
          deletedAt: true,
          scheduledDeletionAt: true,
        },
      });

      if (
        !user ||
        user.status !== UserStatus.WITHDRAWN ||
        !user.scheduledDeletionAt ||
        user.scheduledDeletionAt > finalizedAt
      ) {
        return false;
      }

      await tx.socialAccount.deleteMany({ where: { userId } });
      await tx.pushSubscription.deleteMany({ where: { userId } });
      await tx.billingKey.updateMany({
        where: { userId, status: BillingKeyStatus.ACTIVE },
        data: {
          status: BillingKeyStatus.DEACTIVATED,
          deactivatedAt: finalizedAt,
        },
      });
      await tx.userSubscription.updateMany({
        where: { userId, autoRenew: true },
        data: {
          autoRenew: false,
          canceledAt: finalizedAt,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          email: null,
          nickname: `탈퇴회원_${userId.toString()}`,
          profileImageUrl: null,
          status: UserStatus.DELETED,
          deletedAt: user.deletedAt,
          currentSubscriptionId: null,
          notification: false,
          scheduledDeletionAt: null,
          tokenVersion: { increment: 1 },
        },
      });

      return true;
    });
  };

  private findUserAfterSocialAccountConflict = async (
    error: unknown,
    socialUserInfo: SocialUserInfo,
  ): Promise<CreateSocialUserResult> => {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== 'P2002'
    ) {
      throw error;
    }

    const socialAccount = await this.findSocialAccountWithUser(
      socialUserInfo.provider,
      socialUserInfo.providerUserId,
    );

    if (!socialAccount) {
      throw error;
    }

    return {
      user: socialAccount.user,
      isNewUser: false,
    };
  };
}
