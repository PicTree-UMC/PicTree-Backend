import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ApiResponse } from '../../common/responses/api.response';
import { SuccessCode } from '../../common/responses/success-code';
import { AuthCookie } from './auth.constant';
import { ApiLogout, ApiSocialLogin, ApiTokenRefresh } from './auth.swagger';
import { AuthTokenService } from './auth-token.service';
import { AuthService } from './auth.service';
import { SocialLoginRequestDto } from './dto/social-login-request.dto';
import { SocialLoginResponseDto } from './dto/social-login-response.dto';
import { TokenRefreshResponseDto } from './dto/token-refresh-response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authTokenService: AuthTokenService,
  ) {}

  @Post('social-login')
  @ApiSocialLogin()
  async socialLogin(
    @Body() socialLoginRequestDto: SocialLoginRequestDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiResponse<SocialLoginResponseDto>> {
    const data = await this.authService.socialLogin(socialLoginRequestDto);
    const responseBody: SocialLoginResponseDto = {
      isNewUser: data.isNewUser,
      needTermsAgreement: data.needTermsAgreement,
      needProfileSetup: data.needProfileSetup,
      accessToken: data.accessToken,
      expiresIn: data.expiresIn,
      user: data.user,
    };

    response.cookie(
      AuthCookie.REFRESH_TOKEN,
      data.refreshToken,
      this.authTokenService.getRefreshTokenCookieOptions(),
    );

    return ApiResponse.success(SuccessCode.OK, responseBody);
  }

  @Post('token/refresh')
  @ApiTokenRefresh()
  async refreshToken(
    @Req() request: Request,
  ): Promise<ApiResponse<TokenRefreshResponseDto>> {
    const data = await this.authService.refreshToken(
      this.getRefreshTokenFromCookie(request.headers.cookie),
    );

    return ApiResponse.success(SuccessCode.OK, data);
  }

  @Post('logout')
  @ApiLogout()
  async logout(
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiResponse<null>> {
    await this.authService.logout();
    response.cookie(
      AuthCookie.REFRESH_TOKEN,
      '',
      this.authTokenService.getClearRefreshTokenCookieOptions(),
    );

    return ApiResponse.success(SuccessCode.OK, null);
  }

  private getRefreshTokenFromCookie = (
    cookieHeader?: string,
  ): string | undefined => {
    if (!cookieHeader) {
      return undefined;
    }

    const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
    const refreshTokenCookie = cookies.find((cookie) =>
      cookie.startsWith(`${AuthCookie.REFRESH_TOKEN}=`),
    );

    return refreshTokenCookie?.slice(`${AuthCookie.REFRESH_TOKEN}=`.length);
  };
}
