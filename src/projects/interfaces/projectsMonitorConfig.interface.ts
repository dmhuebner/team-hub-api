import Project from './project.interface';

export default interface ProjectsMonitorConfig {
  projects: Project[];
  intervalLength: number;
}
