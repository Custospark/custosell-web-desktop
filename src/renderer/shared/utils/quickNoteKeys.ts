export const quickNoteKeys = {
  all: ['quickNotes'] as const,
  list: () => [...quickNoteKeys.all, 'list'] as const,
  detail: (id: number) => [...quickNoteKeys.all, 'detail', id] as const,
};
