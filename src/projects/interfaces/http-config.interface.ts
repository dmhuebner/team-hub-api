import HealthCheckHeaders from './healthCheckHeaders.interface';

export default interface HttpConfig {
  headers?: HealthCheckHeaders;
  method: 'GET' | 'POST' | 'PUT';
  path: string;
  requestBody?: any;
}
