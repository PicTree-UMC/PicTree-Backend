import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiResponse } from '../../common/responses/api.response';
import { SuccessCode } from '../../common/responses/success-code';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { AuthCookie } from '../auth/auth.constant';
import { AuthTokenService } from '../auth/auth-token.service';
import type { JwtPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { UpdateUserRequestDto } from './dto/update-user-request.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { ApiGetMe, ApiUpdateMe, ApiWithdrawMe } from './users.swagger';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
@UseGuards(AccessTokenGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authTokenService: AuthTokenService,
  ) {}

  @Get('me')
  @ApiGetMe()
  async getMe(
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<ApiResponse<UserResponseDto>> {
    const data = await this.usersService.getMe(currentUser.userId);

    return ApiResponse.success(SuccessCode.OK, data);
  }

  @Patch('me')
  @ApiUpdateMe()
  async updateMe(
    @CurrentUser() currentUser: JwtPayload,
    @Body() updateUserRequestDto: UpdateUserRequestDto,
  ): Promise<ApiResponse<UserResponseDto>> {
    const data = await this.usersService.updateMe(
      currentUser.userId,
      updateUserRequestDto,
    );

    return ApiResponse.success(SuccessCode.OK, data);
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @ApiWithdrawMe()
  async withdrawMe(
    @CurrentUser() currentUser: JwtPayload,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiResponse<null>> {
    await this.usersService.withdrawMe(currentUser.userId);
    response.cookie(
      AuthCookie.REFRESH_TOKEN,
      '',
      this.authTokenService.getClearRefreshTokenCookieOptions(),
    );

    return ApiResponse.success(SuccessCode.OK, null);
  }
}
