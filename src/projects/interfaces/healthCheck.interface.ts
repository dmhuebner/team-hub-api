import { HealthCheckMethod } from './healthCheckMethod.type';
import HealthCheckHeaders from './healthCheckHeaders.interface';

export default interface HealthCheck {
  path: string;
  method: HealthCheckMethod;
  requestBody?: any;
  successStatuses: number[];
  headers?: HealthCheckHeaders;
  name?: string;
}
