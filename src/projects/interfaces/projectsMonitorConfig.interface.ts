import Project from './project.interface';
import LoginForToken from './login-for-token.interface';

export default interface ProjectsMonitorConfig {
  projects: Project[];
  intervalLength: number;
  loginForToken: LoginForToken;
}
