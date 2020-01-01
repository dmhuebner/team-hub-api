import HealthCheckSuccessCriteria from './health-check-success-criteria.interface';
import HttpConfig from './http-config.interface';

export default interface HealthCheck extends HttpConfig {
  successCriteria: HealthCheckSuccessCriteria;
  name?: string;
  useGeneralToken: boolean;
}
