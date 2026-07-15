import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code';
import { AuthTokenService } from './auth-token.service';
import { JwtPayload } from './auth.types';

type AuthenticatedRequest = Request & { user?: JwtPayload };

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly authTokenService: AuthTokenService) {}

  canActivate = async (context: ExecutionContext): Promise<boolean> => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const accessToken = this.extractBearerToken(request.headers.authorization);

    request.user = await this.authTokenService.verifyAccessToken(accessToken);

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
