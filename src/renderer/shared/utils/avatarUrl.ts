import { getApiUrl } from './env';

const backendRoot = () => getApiUrl().replace(/\/api\/v1\/?$/, '');

/** Resolve avatar or other `/storage/...` paths to a loadable URL. */
export function avatarUrl(path: string | null | undefined): string | undefined {
  if (!path?.trim()) return undefined;
  const trimmed = path.trim();
  if (
    trimmed.startsWith('http://')
    || trimmed.startsWith('https://')
    || trimmed.startsWith('data:')
    || trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }
  return `${backendRoot()}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}
