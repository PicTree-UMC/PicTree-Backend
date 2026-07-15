import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserData, UserRecord } from './users.types';

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

  withdrawUser = (userId: number, withdrawnAt: Date): Promise<UserRecord> => {
    return this.prisma.user.update({
      where: {
        id: BigInt(userId),
      },
      data: {
        status: 'WITHDRAWN',
        deletedAt: withdrawnAt,
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
}
