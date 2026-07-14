import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuthUserRecord,
  CreateSocialUserResult,
  SocialAccountWithUser,
  SocialProvider,
  SocialUserInfo,
} from './auth.types';

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
