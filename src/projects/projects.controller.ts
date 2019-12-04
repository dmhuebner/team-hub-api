import { Body, Controller, Header, HttpCode, HttpStatus, Post, Res, Response } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsDto } from './projectDto';

@Controller('projects')
export class ProjectsController {

  constructor(private projectsService: ProjectsService) {}

  @Post('monitor')
  @Header('Content-Type', 'application/json')
  @HttpCode(200)
  monitor(@Body() projectsDto: ProjectsDto) {
    return this.projectsService.monitor(projectsDto.projects);
  }
}
