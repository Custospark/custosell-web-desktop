import 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** When true, 401 responses do not trigger logout (e.g. connectivity probe). */
    skipAuthRedirect?: boolean;
    /** When true, do not await silent session upgrade before this request. */
    skipSessionUpgrade?: boolean;
    /** Set when the request was issued under a device local session (401 guard). */
    localSessionRequest?: boolean;
  }
}
