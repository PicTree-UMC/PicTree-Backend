import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TreeImagesController } from './tree-images.controller';
import { TreeImagesRepository } from './tree-images.repository';
import { TreeImagesService } from './tree-images.service';

@Module({
  imports: [AuthModule],
  controllers: [TreeImagesController],
  providers: [TreeImagesService, TreeImagesRepository],
})
export class TreeImagesModule {}
