import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import webpush from 'web-push';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code';
import { PushSubscriptionRecord } from '../push-subscriptions/push-subscriptions.types';
import { PushPayload } from './nearby-alerts.types';

@Injectable()
export class WebPushService {
  private configured = false;

  constructor(private readonly configService: ConfigService) {}

  send = async (
    subscription: PushSubscriptionRecord,
    payload: PushPayload,
  ): Promise<boolean> => {
    this.configure();

    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dhKey,
            auth: subscription.authKey,
          },
        },
        JSON.stringify(payload),
      );
      return true;
    } catch (error) {
      const statusCode = this.getStatusCode(error);
      if (statusCode === 404 || statusCode === 410) {
        return false;
      }
      throw error;
    }
  };

  private configure = (): void => {
    if (this.configured) {
      return;
    }

    const subject = this.configService.get<string>('VAPID_SUBJECT');
    const publicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');

    if (!subject || !publicKey || !privateKey) {
      throw new AppException(ErrorCode.PUSH_CONFIG_MISSING);
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    this.configured = true;
  };

  private getStatusCode = (error: unknown): number | undefined => {
    if (typeof error !== 'object' || error === null) {
      return undefined;
    }

    return 'statusCode' in error && typeof error.statusCode === 'number'
      ? error.statusCode
      : undefined;
  };
}
