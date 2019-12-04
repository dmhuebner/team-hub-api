export default interface Healthcheck {
  path: string;
  method: 'GET' | 'POST';
  requestBody: any;
  successStatuses: number[];
}
//         "healthCheck": {
//           "path": "https://api.github.com/users/octocat",
//           "successStatuses": [200]
//         },
