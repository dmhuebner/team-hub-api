import Healthcheck from './healthCheck.interface';

export default interface Project {
  name: string;
  description: string;
  appType: string; // should be an enum?
  uiPath: string;
  healthCheck: Healthcheck;
  dependencies: Project[];
}
