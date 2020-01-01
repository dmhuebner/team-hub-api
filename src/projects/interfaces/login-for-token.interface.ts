import HttpConfig from './http-config.interface';

export default interface LoginForToken extends HttpConfig {
  tokenType: 'Bearer';
  tokenLocationInResponse: string;
}
