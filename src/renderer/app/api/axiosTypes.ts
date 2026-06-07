import 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** When true, 401 responses do not trigger logout (e.g. connectivity probe). */
    skipAuthRedirect?: boolean;
  }
}
