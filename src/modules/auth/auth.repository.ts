import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuthUserRecord,
  SocialAccountWithUser,
  SocialProvider,
  SocialUserInfo,
} from './auth.types';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserById = async (userId: number): Promise<AuthUserRecord | null> => {
    return this.prisma.user.findUnique({
      where: {
        id: BigInt(userId),
      },
    });
  };

  findSocialAccountWithUser = async (
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
        user: true,
      },
    });
  };

  createUserWithSocialAccount = async (
    socialUserInfo: SocialUserInfo,
    nickname: string,
  ): Promise<AuthUserRecord> => {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: socialUserInfo.email,
          nickname,
          profileImageUrl: socialUserInfo.profileImageUrl,
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

      return user;
    });
  };
}
