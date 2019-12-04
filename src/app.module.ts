import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProjectsController } from './projects/projects.controller';
import { HealthController } from './health/health.controller';
import { ProjectsService } from './projects/projects.service';

@Module({
  imports: [],
  controllers: [AppController, ProjectsController, HealthController],
  providers: [AppService, ProjectsService],
})
export class AppModule {}
