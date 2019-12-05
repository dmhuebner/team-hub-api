import HealthCheckStatus from './healthCheckStatus.interface';
import StatusOverview from './statusOverview.interface';

export interface ProjectStatus {
  status: HealthCheckStatus,
  dependencies?: StatusOverview[];
}
