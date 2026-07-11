import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code';
import { AuthCookie, AuthEnv, AuthTokenExpiresIn } from './auth.constant';
import {
  AuthTokens,
  JwtPayload,
  RefreshTokenCookieOptions,
} from './auth.types';

@Injectable()
export class AuthTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  issueTokens = async (payload: JwtPayload): Promise<AuthTokens> => {
    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(payload),
      this.signRefreshToken(payload),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.getAccessTokenExpiresIn(),
    };
  };

  getRefreshTokenCookieOptions = (): RefreshTokenCookieOptions => {
    const maxAge = this.getRefreshTokenExpiresIn() * 1000;

    return {
      httpOnly: true,
      secure: this.isProduction(),
      sameSite: this.isProduction() ? 'none' : 'lax',
      path: AuthCookie.PATH,
      maxAge,
    };
  };

  getClearRefreshTokenCookieOptions = (): RefreshTokenCookieOptions => ({
    ...this.getRefreshTokenCookieOptions(),
    maxAge: 0,
  });

  getRefreshTokenExpiresAt = (): Date => {
    return new Date(Date.now() + this.getRefreshTokenExpiresIn() * 1000);
  };

  private signAccessToken = async (payload: JwtPayload): Promise<string> => {
    return this.jwtService.signAsync(payload, {
      secret: this.getRequiredSecret(AuthEnv.ACCESS_TOKEN_SECRET),
      expiresIn: this.getAccessTokenExpiresIn(),
    });
  };

  private signRefreshToken = async (payload: JwtPayload): Promise<string> => {
    return this.jwtService.signAsync(payload, {
      secret: this.getRequiredSecret(AuthEnv.REFRESH_TOKEN_SECRET),
      expiresIn: this.getRefreshTokenExpiresIn(),
    });
  };

  private getAccessTokenExpiresIn = (): number => {
    return this.getExpiresInSeconds(
      AuthEnv.ACCESS_TOKEN_EXPIRES_IN,
      AuthTokenExpiresIn.ACCESS_TOKEN_SECONDS,
    );
  };

  private getRefreshTokenExpiresIn = (): number => {
    return this.getExpiresInSeconds(
      AuthEnv.REFRESH_TOKEN_EXPIRES_IN,
      AuthTokenExpiresIn.REFRESH_TOKEN_SECONDS,
    );
  };

  private getExpiresInSeconds = (key: string, defaultValue: number): number => {
    const value = this.configService.get<string>(key);

    if (!value) {
      return defaultValue;
    }

    const expiresIn = Number(value);

    if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
      throw new AppException(ErrorCode.AUTH_INVALID_TOKEN_EXPIRES_IN);
    }

    return expiresIn;
  };

  private getRequiredSecret = (key: string): string => {
    const secret = this.configService.get<string>(key);

    if (!secret) {
      throw new AppException(ErrorCode.AUTH_TOKEN_SECRET_MISSING);
    }

    return secret;
  };

  private isProduction = (): boolean => {
    return this.configService.get<string>('NODE_ENV') === 'production';
  };
}
