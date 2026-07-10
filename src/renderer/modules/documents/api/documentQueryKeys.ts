import type { DocumentListFilters } from './documentTypes';

export const documentKeys = {
  all: ['documents'] as const,
  cabinets: (q?: string) => [...documentKeys.all, 'cabinets', q ?? ''] as const,
  cabinet: (id: number) => [...documentKeys.all, 'cabinet', id] as const,
  tree: (cabinetId?: number) => [...documentKeys.all, 'tree', cabinetId ?? 'all'] as const,
  folderChildren: (cabinetId: number, parentId: number | null, page = 1) => [...documentKeys.all, 'folder-children', cabinetId, parentId, page] as const,
  members: () => [...documentKeys.all, 'members'] as const,
  vaultAppearance: () => [...documentKeys.all, 'vault-appearance'] as const,
  activity: (page = 1) => [...documentKeys.all, 'activity', page] as const,
  tags: (q?: string) => [...documentKeys.all, 'tags', q ?? ''] as const,
  folder: (id: number) => [...documentKeys.all, 'folder', id] as const,
  contents: (id: number, page = 1) => [...documentKeys.all, 'contents', id, page] as const,
  list: (filters: DocumentListFilters) => [...documentKeys.all, 'list', filters] as const,
  detail: (id: number) => [...documentKeys.all, 'detail', id] as const,
};
