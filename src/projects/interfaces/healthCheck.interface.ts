export default interface HealthCheck {
  path: string;
  method: 'GET' | 'POST';
  requestBody: any;
  successStatuses: number[];
}
