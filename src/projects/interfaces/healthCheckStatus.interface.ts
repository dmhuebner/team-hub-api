import { HealthCheckMethod } from './healthCheckMethod.type';

export default interface HealthCheckStatus {
  responseBody: any;
  status: number;
  path: string;
  method: HealthCheckMethod;
  timestamp: string;
  up: boolean;
  projectName: string;
  warning: boolean;
}
