import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../../common/responses/api.response';
import { SuccessCode } from '../../common/responses/success-code';
import { AccessTokenGuard } from '../auth/access-token.guard';
import type { JwtPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateTimelineRequestDto } from './dto/create-timeline-request.dto';
import { TimelineIdParamDto } from './dto/timeline-id-param.dto';
import { TimelineQueryDto } from './dto/timeline-query.dto';
import {
  TimelineListResponseDto,
  TimelineResponseDto,
} from './dto/timeline-response.dto';
import { UpdateTimelineRequestDto } from './dto/update-timeline-request.dto';
import {
  ApiCreateTimeline,
  ApiDeleteTimeline,
  ApiGetTimeline,
  ApiGetTimelines,
  ApiUpdateTimeline,
} from './timelines.swagger';
import { TimelinesService } from './timelines.service';

@ApiTags('Timelines')
@Controller('timelines')
@UseGuards(AccessTokenGuard)
export class TimelinesController {
  constructor(private readonly timelinesService: TimelinesService) {}

  @Get()
  @ApiGetTimelines()
  async findAll(
    @CurrentUser() currentUser: JwtPayload,
    @Query() query: TimelineQueryDto,
  ): Promise<ApiResponse<TimelineListResponseDto>> {
    const data = await this.timelinesService.findAll(currentUser.userId, query);

    return ApiResponse.success(SuccessCode.OK, data);
  }

  @Get(':timelineId')
  @ApiGetTimeline()
  async findOne(
    @CurrentUser() currentUser: JwtPayload,
    @Param() param: TimelineIdParamDto,
  ): Promise<ApiResponse<TimelineResponseDto>> {
    const data = await this.timelinesService.findOne(
      currentUser.userId,
      param.timelineId,
    );

    return ApiResponse.success(SuccessCode.OK, data);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateTimeline()
  async create(
    @CurrentUser() currentUser: JwtPayload,
    @Body() request: CreateTimelineRequestDto,
  ): Promise<ApiResponse<TimelineResponseDto>> {
    const data = await this.timelinesService.create(
      currentUser.userId,
      request,
    );

    return ApiResponse.success(SuccessCode.CREATED, data);
  }

  @Patch(':timelineId')
  @ApiUpdateTimeline()
  async update(
    @CurrentUser() currentUser: JwtPayload,
    @Param() param: TimelineIdParamDto,
    @Body() request: UpdateTimelineRequestDto,
  ): Promise<ApiResponse<TimelineResponseDto>> {
    const data = await this.timelinesService.update(
      currentUser.userId,
      param.timelineId,
      request,
    );

    return ApiResponse.success(SuccessCode.OK, data);
  }

  @Delete(':timelineId')
  @HttpCode(HttpStatus.OK)
  @ApiDeleteTimeline()
  async remove(
    @CurrentUser() currentUser: JwtPayload,
    @Param() param: TimelineIdParamDto,
  ): Promise<ApiResponse<null>> {
    await this.timelinesService.remove(currentUser.userId, param.timelineId);

    return ApiResponse.success(SuccessCode.OK, null);
  }
}
