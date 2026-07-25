import { Injectable } from '@nestjs/common';
import { NearbyAlertStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NearbyAlertLogRecord } from './nearby-alerts.types';

const alertInclude = {
  tree: { select: { name: true, defaultImage: true } },
} as const;

@Injectable()
export class NearbyAlertsRepository {
  constructor(private readonly prisma: PrismaService) {}

  isNotificationEnabled = async (userId: bigint): Promise<boolean> => {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notification: true },
    });
    return user?.notification ?? false;
  };

  createIfAbsent = async (
    userId: bigint,
    treeId: bigint,
    distanceM: number,
    alertDate: Date,
  ): Promise<NearbyAlertLogRecord | null> => {
    try {
      return await this.prisma.nearbyAlertLog.create({
        data: {
          userId,
          treeId,
          distanceM,
          alertDate,
          status: NearbyAlertStatus.PENDING,
        },
        include: alertInclude,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return this.retryFailedLog(userId, treeId, distanceM, alertDate);
      }
      throw error;
    }
  };

  private retryFailedLog = async (
    userId: bigint,
    treeId: bigint,
    distanceM: number,
    alertDate: Date,
  ): Promise<NearbyAlertLogRecord | null> => {
    const existingLog = await this.prisma.nearbyAlertLog.findUnique({
      where: {
        userId_treeId_alertDate: { userId, treeId, alertDate },
      },
      select: { id: true, status: true },
    });
    if (!existingLog || existingLog.status !== NearbyAlertStatus.FAILED) {
      return null;
    }

    const retried = await this.prisma.nearbyAlertLog.updateMany({
      where: {
        id: existingLog.id,
        status: NearbyAlertStatus.FAILED,
      },
      data: {
        distanceM,
        status: NearbyAlertStatus.PENDING,
        sentAt: null,
        openedAt: null,
      },
    });
    if (retried.count === 0) {
      return null;
    }

    return this.prisma.nearbyAlertLog.findUnique({
      where: { id: existingLog.id },
      include: alertInclude,
    });
  };

  updateStatus = (
    alertLogId: bigint,
    status: NearbyAlertStatus,
  ): Promise<NearbyAlertLogRecord> =>
    this.prisma.nearbyAlertLog.update({
      where: { id: alertLogId },
      data: {
        status,
        ...(status === NearbyAlertStatus.SENT && { sentAt: new Date() }),
      },
      include: alertInclude,
    });

  findAllByUser = async (
    userId: bigint,
    skip: number,
    take: number,
  ): Promise<[NearbyAlertLogRecord[], number]> => {
    const where = {
      userId,
      status: {
        in: [NearbyAlertStatus.SENT, NearbyAlertStatus.OPENED],
      },
    };
    return this.prisma.$transaction([
      this.prisma.nearbyAlertLog.findMany({
        where,
        include: alertInclude,
        orderBy: [{ sentAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
      this.prisma.nearbyAlertLog.count({ where }),
    ]);
  };

  findByIdAndUser = (
    alertLogId: bigint,
    userId: bigint,
  ): Promise<NearbyAlertLogRecord | null> =>
    this.prisma.nearbyAlertLog.findFirst({
      where: {
        id: alertLogId,
        userId,
        status: {
          in: [NearbyAlertStatus.SENT, NearbyAlertStatus.OPENED],
        },
      },
      include: alertInclude,
    });

  markOpened = (
    alertLogId: bigint,
    openedAt: Date,
  ): Promise<NearbyAlertLogRecord> =>
    this.prisma.nearbyAlertLog.update({
      where: { id: alertLogId },
      data: { status: NearbyAlertStatus.OPENED, openedAt },
      include: alertInclude,
    });
}
