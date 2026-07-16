import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../../common/responses/api.response';
import { SuccessCode } from '../../common/responses/success-code';
import { AccessTokenGuard } from '../auth/access-token.guard';
import type { JwtPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { AgreeTermsRequestDto } from './dto/agree-terms-request.dto';
import { TermsAgreementResponseDto } from './dto/terms-agreement-response.dto';
import { ApiAgreeTerms } from './terms.swagger';
import { TermsService } from './terms.service';

@ApiTags('Terms')
@Controller('users/me/terms-agreements')
@UseGuards(AccessTokenGuard)
export class TermsAgreementsController {
  constructor(private readonly termsService: TermsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiAgreeTerms()
  async agreeTerms(
    @CurrentUser() currentUser: JwtPayload,
    @Body() agreeTermsRequestDto: AgreeTermsRequestDto,
  ): Promise<ApiResponse<TermsAgreementResponseDto>> {
    const data = await this.termsService.agreeTerms(
      currentUser.userId,
      agreeTermsRequestDto,
    );

    return ApiResponse.success(SuccessCode.OK, data);
  }
}
