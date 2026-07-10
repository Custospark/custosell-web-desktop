import { axiosInstance } from '../../../app/api/axiosConfig';
import { DOCUMENTS } from './documentEndpoints';
import type { DocumentItem, DocumentMemberRole, DocumentVisibility } from './documentTypes';
import { canInlineViewDocument } from './documentFileViewUtils';

function unwrapEntity<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in (payload as object)) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

export type UploadDocumentPayload = {
  file: File;
  title?: string;
  description?: string | null;
  visibility?: DocumentVisibility;
  folder_id?: number | null;
  member_user_ids?: number[];
  member_roles?: Record<number, DocumentMemberRole>;
  customer_id?: number | null;
  project_id?: number | null;
  tags?: string[];
};

export async function uploadDocumentWithProgress(
  payload: UploadDocumentPayload,
  onProgress?: (percent: number) => void,
): Promise<DocumentItem> {
  const form = new FormData();
  form.append('file', payload.file);
  if (payload.title) form.append('title', payload.title);
  if (payload.description) form.append('description', payload.description);
  if (payload.visibility) form.append('visibility', payload.visibility);
  if (payload.folder_id != null) form.append('folder_id', String(payload.folder_id));
  if (payload.customer_id != null) form.append('customer_id', String(payload.customer_id));
  if (payload.project_id != null) form.append('project_id', String(payload.project_id));
  payload.member_user_ids?.forEach((id) => form.append('member_user_ids[]', String(id)));
  if (payload.member_roles) {
    Object.entries(payload.member_roles).forEach(([userId, role]) => {
      form.append(`member_roles[${userId}]`, role);
    });
  }
  payload.tags?.forEach((tag) => form.append('tags[]', tag));

  const { data } = await axiosInstance.post(DOCUMENTS.UPLOAD, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 600_000,
    onUploadProgress: (event) => {
      if (!event.total || !onProgress) return;
      onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    },
  });

  onProgress?.(100);
  return unwrapEntity<DocumentItem>(data);
}

export async function downloadFileWithProgress(
  url: string,
  fileName: string,
  onProgress?: (percent: number) => void,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'blob';

    xhr.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    };

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error('Download failed'));
        return;
      }
      onProgress?.(100);
      const blob = xhr.response as Blob;
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
      resolve();
    };

    xhr.onerror = () => reject(new Error('Download failed'));
    xhr.send();
  });
}

export {
  isPdfDocument,
  isImageDocument,
  canInlineViewDocument,
  isAudioDocument,
  isVideoDocument,
  DOCUMENT_MEDIA_MAX_BYTES,
} from './documentFileViewUtils';

export function formatDocumentBytes(size?: number | null): string {
  if (!size || size <= 0) return '—';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function canPreviewDocument(doc: DocumentItem): boolean {
  return canInlineViewDocument(doc);
}

export function createTransferId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function downloadFolderExportWithProgress(
  folderId: number,
  fileName: string,
  onProgress?: (percent: number) => void,
): Promise<void> {
  const { data } = await axiosInstance.get(DOCUMENTS.FOLDER_EXPORT(folderId), {
    responseType: 'blob',
    timeout: 600_000,
    onDownloadProgress: (event) => {
      if (!event.total || !onProgress) return;
      onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    },
  });

  onProgress?.(100);
  const blob = data as Blob;
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName.endsWith('.zip') ? fileName : `${fileName}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(objectUrl);
}
