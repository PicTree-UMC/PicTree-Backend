import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code';
import { JwtPayload } from './auth.types';

type AuthenticatedRequest = Request & { user?: JwtPayload };

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): JwtPayload => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.user) {
      throw new AppException(ErrorCode.AUTH_INVALID_ACCESS_TOKEN);
    }

    return request.user;
  },
);
