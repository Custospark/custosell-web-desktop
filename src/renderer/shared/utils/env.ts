/** Must match `API_BASE_URL` in `app/api/apiConfig.ts` (storage URLs, thumbnails, etc.).
 *  Driven by VITE_API_BASE_URL from .env / .env.[mode].
 *  Fallback: http://localhost:8000/api/v1 (bare local dev without .env). */
export function getApiUrl(): string {
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
}
