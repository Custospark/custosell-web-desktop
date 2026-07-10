import type { DocumentItem } from './documentTypes';

/** Truncate long names for UI while preserving full text in tooltips. */
export function truncateDisplayName(name: string, maxLength = 48): string {
  const trimmed = name.trim();
  if (trimmed.length <= maxLength) return trimmed;

  const head = Math.ceil((maxLength - 1) / 2);
  const tail = Math.floor((maxLength - 1) / 2);

  return `${trimmed.slice(0, head)}…${trimmed.slice(-tail)}`;
}

export function documentPrimaryLabel(doc: { title: string; file_name?: string | null }): string {
  return doc.title?.trim() || doc.file_name?.trim() || 'Untitled';
}

export function documentSecondaryLabel(doc: { title: string; file_name?: string | null }): string | null {
  const fileName = doc.file_name?.trim();
  const title = doc.title?.trim();
  if (!fileName || !title || fileName === title) return null;
  return fileName;
}

export type FileIconKind =
  | 'folder'
  | 'folder-open'
  | 'pdf'
  | 'word'
  | 'excel'
  | 'image'
  | 'video'
  | 'audio'
  | 'archive'
  | 'code'
  | 'link'
  | 'generic';

function extensionOf(name?: string | null): string {
  if (!name) return '';
  const idx = name.lastIndexOf('.');
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : '';
}

export function resolveDocumentIconKind(doc: Pick<DocumentItem, 'type' | 'mime_type' | 'file_name' | 'title'>): FileIconKind {
  if (doc.type === 'link') return 'link';
  if (doc.type === 'image') return 'image';

  const mime = doc.mime_type?.toLowerCase() ?? '';
  const ext = extensionOf(doc.file_name) || extensionOf(doc.title);

  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image';
  if (mime.startsWith('video/') || ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return 'audio';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || mime.includes('zip') || mime.includes('archive')) return 'archive';
  if (['doc', 'docx', 'odt', 'rtf'].includes(ext) || mime.includes('word')) return 'word';
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext) || mime.includes('spreadsheet') || mime.includes('excel')) return 'excel';
  if (['js', 'ts', 'tsx', 'jsx', 'json', 'html', 'css', 'php', 'py', 'java', 'cs', 'xml', 'yaml', 'yml', 'md'].includes(ext)) return 'code';

  return 'generic';
}

export function documentIconLabel(doc: DocumentItem): string {
  return documentPrimaryLabel(doc);
}
