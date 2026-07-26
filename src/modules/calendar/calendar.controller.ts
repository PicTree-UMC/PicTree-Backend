import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../../common/responses/api.response';
import { SuccessCode } from '../../common/responses/success-code';
import { AccessTokenGuard } from '../auth/access-token.guard';
import type { JwtPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { CalendarService } from './calendar.service';
import { CalendarQueryDto } from './dto/calendar-query.dto';
import { CalendarResponseDto } from './dto/calendar-response.dto';
import { ApiGetCalendar } from './calendar.swagger';

@ApiTags('Calendar')
@Controller('calendar')
@UseGuards(AccessTokenGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  @ApiGetCalendar()
  async getCalendar(
    @CurrentUser() currentUser: JwtPayload,
    @Query() query: CalendarQueryDto,
  ): Promise<ApiResponse<CalendarResponseDto>> {
    const data = await this.calendarService.getCalendar(
      currentUser.userId,
      query,
    );

    return ApiResponse.success(SuccessCode.CALENDAR_RETRIEVED, data);
  }
}
