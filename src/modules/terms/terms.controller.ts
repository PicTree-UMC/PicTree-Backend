import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../../common/responses/api.response';
import { SuccessCode } from '../../common/responses/success-code';
import { TermResponseDto } from './dto/term-response.dto';
import { ApiGetTerms } from './terms.swagger';
import { TermsService } from './terms.service';

@ApiTags('Terms')
@Controller('terms')
export class TermsController {
  constructor(private readonly termsService: TermsService) {}

  @Get()
  @ApiGetTerms()
  async getTerms(): Promise<ApiResponse<TermResponseDto[]>> {
    const data = await this.termsService.getTerms();

    return ApiResponse.success(SuccessCode.OK, data);
  }
}
