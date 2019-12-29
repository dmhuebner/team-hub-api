export default interface HealthCheckSuccessCriteria {
  successStatuses: number[];
  successResponseBody?: HealthCheckSuccessResponseBody;
}

interface HealthCheckSuccessResponseBody {
  type: 'string' | 'json';
  responseBodyEquals?: string;
  responseBodyContains?: string[];
}
