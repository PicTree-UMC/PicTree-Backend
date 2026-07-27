import { Injectable, Logger } from '@nestjs/common';
import { NearbyAlertStatus } from '@prisma/client';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code';
import { PushSubscriptionsRepository } from '../push-subscriptions/push-subscriptions.repository';
import { NEARBY_TREE_RADIUS_M } from '../trees/trees.constant';
import { TreesRepository } from '../trees/trees.repository';
import { CheckNearbyAlertRequestDto } from './dto/check-nearby-alert-request.dto';
import { NearbyAlertQueryDto } from './dto/nearby-alert-query.dto';
import {
  CheckNearbyAlertResponseDto,
  NearbyAlertLogListResponseDto,
  NearbyAlertLogResponseDto,
} from './dto/nearby-alert-response.dto';
import { NearbyAlertsRepository } from './nearby-alerts.repository';
import { NearbyAlertLogRecord } from './nearby-alerts.types';
import { WebPushService } from './web-push.service';

@Injectable()
export class NearbyAlertsService {
  private readonly logger = new Logger(NearbyAlertsService.name);

  constructor(
    private readonly nearbyAlertsRepository: NearbyAlertsRepository,
    private readonly treesRepository: TreesRepository,
    private readonly pushSubscriptionsRepository: PushSubscriptionsRepository,
    private readonly webPushService: WebPushService,
  ) {}

  check = async (
    userId: number,
    request: CheckNearbyAlertRequestDto,
  ): Promise<CheckNearbyAlertResponseDto> => {
    const [notificationEnabled, trees] = await Promise.all([
      this.nearbyAlertsRepository.isNotificationEnabled(BigInt(userId)),
      this.treesRepository.findNearbyTrees(
        request.latitude,
        request.longitude,
        NEARBY_TREE_RADIUS_M,
      ),
    ]);

    if (!notificationEnabled) {
      return { nearbyCount: trees.length, sentCount: 0 };
    }

    const subscriptions =
      await this.pushSubscriptionsRepository.findActiveByUser(BigInt(userId));
    if (subscriptions.length === 0) {
      return { nearbyCount: trees.length, sentCount: 0 };
    }

    let sentCount = 0;
    const alertDate = this.getKoreanDate(new Date());

    for (const tree of trees) {
      const distanceM = Math.round(Number(tree.distanceM));
      try {
        const log = await this.nearbyAlertsRepository.createIfAbsent(
          BigInt(userId),
          tree.id,
          distanceM,
          alertDate,
        );
        if (!log) {
          continue;
        }

        const deliveryResults = await Promise.all(
          subscriptions.map(async (subscription) => {
            try {
              const delivered = await this.webPushService.send(subscription, {
                title: '근처에 심어진 나무가 있어요',
                body: `${tree.name} · 약 ${distanceM}m`,
                data: {
                  url: `/trees/${Number(tree.id)}`,
                  treeId: Number(tree.id),
                  alertLogId: Number(log.id),
                },
              });
              if (!delivered) {
                await this.pushSubscriptionsRepository.deactivate(
                  subscription.id,
                );
              }
              return delivered;
            } catch (error) {
              this.logTreeProcessingError(tree.id, error);
              return false;
            }
          }),
        );
        const delivered = deliveryResults.some(Boolean);
        await this.nearbyAlertsRepository.updateStatus(
          log.id,
          delivered ? NearbyAlertStatus.SENT : NearbyAlertStatus.FAILED,
        );
        if (delivered) {
          sentCount += 1;
        }
      } catch (error) {
        this.logTreeProcessingError(tree.id, error);
      }
    }

    return { nearbyCount: trees.length, sentCount };
  };

  findLogs = async (
    userId: number,
    query: NearbyAlertQueryDto,
  ): Promise<NearbyAlertLogListResponseDto> => {
    const skip = (query.page - 1) * query.size;
    const [logs, totalElements] =
      await this.nearbyAlertsRepository.findAllByUser(
        BigInt(userId),
        skip,
        query.size,
      );
    const totalPages = Math.ceil(totalElements / query.size);

    return {
      items: logs.map(this.toResponseDto),
      page: query.page,
      size: query.size,
      totalElements,
      totalPages,
      hasNext: query.page < totalPages,
    };
  };

  open = async (
    userId: number,
    alertLogId: number,
  ): Promise<NearbyAlertLogResponseDto> => {
    const log = await this.nearbyAlertsRepository.findByIdAndUser(
      BigInt(alertLogId),
      BigInt(userId),
    );
    if (!log) {
      throw new AppException(ErrorCode.NEARBY_ALERT_NOT_FOUND);
    }

    const openedLog = log.openedAt
      ? log
      : await this.nearbyAlertsRepository.markOpened(log.id, new Date());
    return this.toResponseDto(openedLog);
  };

  private getKoreanDate = (now: Date): Date => {
    const koreanTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    return new Date(
      Date.UTC(
        koreanTime.getUTCFullYear(),
        koreanTime.getUTCMonth(),
        koreanTime.getUTCDate(),
      ),
    );
  };

  private logTreeProcessingError = (treeId: bigint, error: unknown): void => {
    const message = `근처 나무 알림 처리 실패 (treeId=${treeId.toString()})`;
    if (error instanceof Error) {
      this.logger.error(message, error.stack);
      return;
    }

    this.logger.error(message);
  };

  private toResponseDto = (
    log: NearbyAlertLogRecord,
  ): NearbyAlertLogResponseDto => ({
    alertLogId: Number(log.id),
    treeId: Number(log.treeId),
    treeName: log.tree.name,
    defaultImage: log.tree.defaultImage,
    distanceM: log.distanceM,
    status: log.status,
    sentAt: log.sentAt,
    openedAt: log.openedAt,
  });
}
