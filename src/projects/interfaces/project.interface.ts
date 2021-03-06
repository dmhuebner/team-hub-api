import Healthcheck from './healthCheck.interface';

export default interface Project {
  name: string;
  description: string;
  appType: string; // should be an enum?
  uiPath?: string;
  repoPath?: string;
  docsPath?: string;
  logsPath?: string;
  deploymentPath?: string;
  healthChecks: Healthcheck[];
  dependencies: Project[];
}
