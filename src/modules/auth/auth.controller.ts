import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../../common/responses/api.response';
import { SuccessCode } from '../../common/responses/success-code';
import { AuthService } from './auth.service';
import { SocialLoginRequestDto } from './dto/social-login-request.dto';
import { SocialLoginResponseDto } from './dto/social-login-response.dto';
import { TokenRefreshResponseDto } from './dto/token-refresh-response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('social-login')
  @ApiOperation({ summary: '소셜 로그인/회원가입' })
  async socialLogin(
    @Body() socialLoginRequestDto: SocialLoginRequestDto,
  ): Promise<ApiResponse<SocialLoginResponseDto>> {
    const data = await this.authService.socialLogin(socialLoginRequestDto);

    return ApiResponse.success(SuccessCode.OK, data);
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
