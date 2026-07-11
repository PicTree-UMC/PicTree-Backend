import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code';
import { SocialLoginRequestDto } from './dto/social-login-request.dto';
import { SocialLoginResponseDto } from './dto/social-login-response.dto';
import { TokenRefreshResponseDto } from './dto/token-refresh-response.dto';

@Injectable()
export class AuthService {
  socialLogin = (
    socialLoginRequestDto: SocialLoginRequestDto,
  ): Promise<SocialLoginResponseDto> => {
    void socialLoginRequestDto;

    throw new AppException(ErrorCode.AUTH_NOT_IMPLEMENTED);
  };

  refreshToken = (): Promise<TokenRefreshResponseDto> => {
    throw new AppException(ErrorCode.AUTH_NOT_IMPLEMENTED);
  };

  logout = (): Promise<null> => {
    throw new AppException(ErrorCode.AUTH_NOT_IMPLEMENTED);
  };
}
