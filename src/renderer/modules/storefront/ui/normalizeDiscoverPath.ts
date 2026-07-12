/** Normalize HashRouter / trailing-slash pathname quirks. */
export function normalizeDiscoverPath(pathname: string): string {
  if (!pathname || pathname === '/') return pathname || '/';
  return pathname.replace(/\/+$/, '') || '/';
}
