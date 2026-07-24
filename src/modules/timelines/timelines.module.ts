import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TimelinesController } from './timelines.controller';
import { TimelinesRepository } from './timelines.repository';
import { TimelinesService } from './timelines.service';

@Module({
  imports: [AuthModule],
  controllers: [TimelinesController],
  providers: [TimelinesService, TimelinesRepository],
})
export class TimelinesModule {}
