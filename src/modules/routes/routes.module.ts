import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RoutesController } from './routes.controller';
import { RoutesRepository } from './routes.repository';
import { RoutesService } from './routes.service';

@Module({
  imports: [AuthModule],
  controllers: [RoutesController],
  providers: [RoutesService, RoutesRepository],
})
export class RoutesModule {}
