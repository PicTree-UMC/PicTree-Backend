import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code';
import { AuthTokenService } from './auth-token.service';
import { AuthRepository } from './auth.repository';
import { JwtPayload } from './auth.types';
import { UserStatus } from '../users/users.constant';

type AuthenticatedRequest = Request & { user?: JwtPayload };

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly authTokenService: AuthTokenService,
    private readonly authRepository: AuthRepository,
  ) {}

  canActivate = async (context: ExecutionContext): Promise<boolean> => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const accessToken = this.extractBearerToken(request.headers.authorization);

    const payload = await this.authTokenService.verifyAccessToken(accessToken);
    const user = await this.authRepository.findTokenUserById(payload.userId);

    if (!user || (payload.tokenVersion ?? 0) !== user.tokenVersion) {
      throw new AppException(ErrorCode.AUTH_INVALID_ACCESS_TOKEN);
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new AppException(ErrorCode.USER_UNAVAILABLE);
    }

    request.user = payload;

    return true;
  };

  private extractBearerToken = (authorization?: string): string => {
    const [scheme, token, ...rest] = authorization?.trim().split(/\s+/) ?? [];

    if (scheme?.toLowerCase() !== 'bearer' || !token || rest.length > 0) {
      throw new AppException(ErrorCode.AUTH_INVALID_ACCESS_TOKEN);
    }

    return token;
  };
}
