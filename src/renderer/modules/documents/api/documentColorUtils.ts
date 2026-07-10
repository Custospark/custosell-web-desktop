import { FOLDER_PRESET_COLORS } from '../../../shared/utils/surfaceStyles';
import type { DocumentFolder, DocumentTag } from './documentTypes';

export function resolveFolderColor(folder: Pick<DocumentFolder, 'id' | 'cover_color'>): string {
  if (folder.cover_color) return folder.cover_color;
  return FOLDER_PRESET_COLORS[folder.id % FOLDER_PRESET_COLORS.length] ?? '#6366f1';
}

export function resolveTagColor(tag: Pick<DocumentTag, 'slug' | 'color'>): string {
  if (tag.color) return tag.color;
  const index = Math.abs(tag.slug.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % FOLDER_PRESET_COLORS.length;
  return FOLDER_PRESET_COLORS[index] ?? '#6366f1';
}
