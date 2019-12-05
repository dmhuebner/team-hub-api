import { Body, Controller, Header, HttpCode, Post } from '@nestjs/common';
import { ProjectsDto } from './projectDto';

@Controller('projects')
export class ProjectsController {

  @Post('monitor')
  @Header('Content-Type', 'application/json')
  @HttpCode(200)
  monitor(@Body() projectsDto: ProjectsDto) {
    return 'Monitor route not in use';
  }
}
