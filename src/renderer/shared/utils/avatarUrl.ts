import { API_BASE_URL } from '../../app/api/apiConfig';

const BACKEND_ROOT = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

export function avatarUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${BACKEND_ROOT}${path.startsWith('/') ? '' : '/'}${path}`;
}
