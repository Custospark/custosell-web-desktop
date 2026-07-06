/** Must match `API_BASE_URL` in `app/api/apiConfig.ts` (storage URLs, thumbnails, etc.). */
export function getApiUrl(): string {
  return import.meta.env.DEV
    ? 'http://localhost:8000/api/v1'
    : (import.meta.env.VITE_API_BASE_URL || 'https://api.custosell.com/api/v1');
}
