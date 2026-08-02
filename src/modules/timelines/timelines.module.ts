import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TreesModule } from '../trees/trees.module';
import { TimelinesController } from './timelines.controller';
import { TimelinesRepository } from './timelines.repository';
import { TimelinesService } from './timelines.service';

@Module({
  imports: [AuthModule, TreesModule],
  controllers: [TimelinesController],
  providers: [TimelinesService, TimelinesRepository],
})
export class TimelinesModule {}
