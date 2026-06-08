import { getApiUrl } from '../../../shared/utils/env';
import type { GuideTutorialDto } from './GuideTypes';

function looksLikePublicDiskRelativePath(s: string): boolean {
  if (!s || /\s/.test(s)) return false;
  if (/^https?:\/\//i.test(s) || s.startsWith('//') || s.startsWith('blob:')) return false;
  return s.startsWith('guide-tutorial-thumbnails/');
}

function resolveStorageUrl(path: string | null | undefined): string | null {
  const p = path?.trim();
  if (!p) return null;
  if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('//')) return p;
  const base = getApiUrl().replace(/\/api\/v1\/?$/, '');
  return `${base}/storage/${p.replace(/^\/+/, '')}`;
}

export function resolveGuideTutorialThumbnailSrc(
  m: Pick<
    GuideTutorialDto,
    'thumbnail_path' | 'thumbnail_url' | 'thumbnail_upload_url' | 'thumbnail_video_preview_url'
  >,
): string | null {
  const uploaded = m.thumbnail_upload_url?.trim() || resolveStorageUrl(m.thumbnail_path);
  if (uploaded) return uploaded;

  const ext = m.thumbnail_url?.trim() ?? '';
  if (ext) {
    if (ext.startsWith('http://') || ext.startsWith('https://') || ext.startsWith('//')) return ext;
    if (looksLikePublicDiskRelativePath(ext)) {
      const fromUrlField = resolveStorageUrl(ext);
      if (fromUrlField) return fromUrlField;
    }
  }

  const preview = m.thumbnail_video_preview_url?.trim();
  if (preview && (preview.startsWith('http://') || preview.startsWith('https://') || preview.startsWith('//'))) {
    return preview;
  }

  return null;
}
