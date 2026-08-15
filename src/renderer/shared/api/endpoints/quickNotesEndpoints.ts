export const QUICK_NOTES = {
  BASE: '/quick-notes',
  ITEM: (id: number) => `/quick-notes/${id}`,
  REORDER: '/quick-notes/reorder',
  BACKGROUND: '/quick-notes/background',
} as const;
