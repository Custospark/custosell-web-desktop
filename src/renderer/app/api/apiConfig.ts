/** API base URL driven by VITE_API_BASE_URL from .env / .env.[mode].
 *  Dev uses .env.development → http://localhost:8000/api/v1.
 *  Staging uses .env.staging   → https://staging-api.custosell.com/api/v1.
 *  Production uses .env (base) → https://api.custosell.com/api/v1.
 *  Fallback: http://localhost:8000/api/v1 (bare local dev without .env). */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const API_TIMEOUT = 60000;
