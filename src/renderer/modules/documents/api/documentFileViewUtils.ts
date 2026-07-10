import type { DocumentItem } from './documentTypes';

export const DOCUMENT_MEDIA_MAX_BYTES = 10 * 1024 * 1024;
export const DOCUMENT_TEXT_VIEW_MAX_BYTES = 2 * 1024 * 1024;

const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'json', 'js', 'ts', 'tsx', 'jsx', 'css', 'scss', 'html', 'htm',
  'xml', 'yaml', 'yml', 'py', 'php', 'java', 'cs', 'c', 'cpp', 'h', 'go', 'rs', 'rb', 'sh',
  'sql', 'env', 'ini', 'log', 'csv', 'tsv', 'vue', 'svelte',
]);

function extensionOf(name?: string | null): string {
  if (!name) return '';
  const idx = name.lastIndexOf('.');
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : '';
}

function fileExtension(doc: Pick<DocumentItem, 'file_name' | 'title'>): string {
  return extensionOf(doc.file_name) || extensionOf(doc.title);
}

export function isAudioDocument(doc: Pick<DocumentItem, 'mime_type' | 'file_name' | 'title'>): boolean {
  const mime = doc.mime_type?.toLowerCase() ?? '';
  const ext = fileExtension(doc);
  return mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'webm'].includes(ext);
}

export function isVideoDocument(doc: Pick<DocumentItem, 'mime_type' | 'file_name' | 'title'>): boolean {
  const mime = doc.mime_type?.toLowerCase() ?? '';
  const ext = fileExtension(doc);
  return mime.startsWith('video/') || ['mp4', 'webm', 'mov', 'm4v', 'ogv'].includes(ext);
}

export function isCsvDocument(doc: Pick<DocumentItem, 'mime_type' | 'file_name' | 'title'>): boolean {
  const mime = doc.mime_type?.toLowerCase() ?? '';
  const ext = fileExtension(doc);
  return ext === 'csv' || ext === 'tsv' || mime.includes('csv') || mime === 'text/tab-separated-values';
}

export function isWordDocument(doc: Pick<DocumentItem, 'mime_type' | 'file_name' | 'title'>): boolean {
  const mime = doc.mime_type?.toLowerCase() ?? '';
  const ext = fileExtension(doc);
  return ext === 'docx' || mime.includes('wordprocessingml');
}

export function isTextViewableDocument(doc: Pick<DocumentItem, 'mime_type' | 'file_name' | 'title' | 'type'>): boolean {
  if (doc.type === 'link') return false;
  if (isCsvDocument(doc) || isWordDocument(doc)) return true;
  const mime = doc.mime_type?.toLowerCase() ?? '';
  const ext = fileExtension(doc);
  if (TEXT_EXTENSIONS.has(ext)) return true;
  if (mime.startsWith('text/')) return true;
  if (mime === 'application/json' || mime === 'application/xml') return true;
  return false;
}

export function isEditableTextDocument(doc: Pick<DocumentItem, 'mime_type' | 'file_name' | 'title' | 'type'>): boolean {
  if (doc.type === 'link' || isWordDocument(doc)) return false;
  return isTextViewableDocument(doc);
}

export function isPdfDocument(doc: Pick<DocumentItem, 'mime_type' | 'file_name'>): boolean {
  if (doc.mime_type === 'application/pdf') return true;
  return doc.file_name?.toLowerCase().endsWith('.pdf') ?? false;
}

export function isImageDocument(doc: Pick<DocumentItem, 'mime_type' | 'type'>): boolean {
  if (doc.type === 'image') return true;
  return doc.mime_type?.startsWith('image/') ?? false;
}

export function canInlineViewDocument(doc: DocumentItem): boolean {
  if (doc.type === 'link') return true;
  if (!doc.file_url) return false;
  return isPdfDocument(doc)
    || isImageDocument(doc)
    || isAudioDocument(doc)
    || isVideoDocument(doc)
    || isTextViewableDocument(doc);
}

export function isMediaFile(file: Pick<File, 'name' | 'type' | 'size'>): boolean {
  return isAudioDocument({ mime_type: file.type, file_name: file.name, title: file.name })
    || isVideoDocument({ mime_type: file.type, file_name: file.name, title: file.name });
}

export function parseCsvRows(content: string): string[][] {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((line, index, all) => (
    line.length > 0 || index < all.length - 1
  ));
  return lines.map((line) => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        cells.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current);
    return cells;
  });
}
