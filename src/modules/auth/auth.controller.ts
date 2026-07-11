import { Body, Controller, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiResponse } from '../../common/responses/api.response';
import { SuccessCode } from '../../common/responses/success-code';
import { AuthCookie } from './auth.constant';
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
  @ApiOperation({ summary: '소셜 로그인/회원가입' })
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
  @ApiOperation({ summary: 'Access Token 재발급' })
  async refreshToken(): Promise<ApiResponse<TokenRefreshResponseDto>> {
    const data = await this.authService.refreshToken();

    return ApiResponse.success(SuccessCode.OK, data);
  }

  @Post('logout')
  @ApiOperation({ summary: '로그아웃' })
  async logout(): Promise<ApiResponse<null>> {
    await this.authService.logout();

    return ApiResponse.success(SuccessCode.OK, null);
  }
}
