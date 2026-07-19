import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TreesController } from './trees.controller';
import { TreesRepository } from './trees.repository';
import { TreesService } from './trees.service';

@Module({
  imports: [AuthModule],
  controllers: [TreesController],
  providers: [TreesService, TreesRepository],
})
export class TreesModule {}
