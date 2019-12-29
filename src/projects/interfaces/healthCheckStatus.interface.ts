import { HealthCheckMethod } from './healthCheckMethod.type';
import HealthCheckSuccessCriteria from './health-check-success-criteria.interface';

export default interface HealthCheckStatus {
  responseBody: any;
  status: number;
  path: string;
  method: HealthCheckMethod;
  timestamp: string;
  up: boolean;
  projectName: string;
  warning: boolean;
  invalidResponseBody?: boolean; // based on the successCriteria
  successCriteria: HealthCheckSuccessCriteria;
  healthCheckName?: string;
}
