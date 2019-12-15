import HealthCheckStatus from './healthCheckStatus.interface';
import StatusOverview from './statusOverview.interface';

export interface ProjectStatus {
  projectName: string;
  up: boolean;
  warning: boolean;
  statuses: HealthCheckStatus[];
  dependencies?: StatusOverview[];
}
