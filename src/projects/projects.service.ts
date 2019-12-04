import { Injectable } from '@nestjs/common';
import Project from './project.interface';

@Injectable()
export class ProjectsService {

  monitor(projects: Project[]) {
    return projects;
  }
}
