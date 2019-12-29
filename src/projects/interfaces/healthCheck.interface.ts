import { HealthCheckMethod } from './healthCheckMethod.type';
import HealthCheckHeaders from './healthCheckHeaders.interface';
import HealthCheckSuccessCriteria from './health-check-success-criteria.interface';

export default interface HealthCheck {
  path: string;
  method: HealthCheckMethod;
  requestBody?: any;
  successCriteria: HealthCheckSuccessCriteria;
  headers?: HealthCheckHeaders;
  name?: string;
}
