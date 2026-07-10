export const documentKeys = {
  all: ['documents'] as const,
  tree: () => [...documentKeys.all, 'tree'] as const,
  folderChildren: (parentId: number | null, page = 1) => [...documentKeys.all, 'folder-children', parentId, page] as const,
  members: () => [...documentKeys.all, 'members'] as const,
  tags: (q?: string) => [...documentKeys.all, 'tags', q ?? ''] as const,
  folder: (id: number) => [...documentKeys.all, 'folder', id] as const,
  contents: (id: number, page = 1) => [...documentKeys.all, 'contents', id, page] as const,
  list: (filters: Record<string, unknown>) => [...documentKeys.all, 'list', filters] as const,
  detail: (id: number) => [...documentKeys.all, 'detail', id] as const,
};
