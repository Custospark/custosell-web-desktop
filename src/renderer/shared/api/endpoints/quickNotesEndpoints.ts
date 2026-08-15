export const QUICK_NOTES = {
  BASE: '/quick-notes',
  ITEM: (id: number) => `/quick-notes/${id}`,
  REORDER: '/quick-notes/reorder',
  BACKGROUND: '/quick-notes/background',
  TAG_RENAME: '/quick-notes/tags/rename',
  TAG_REMOVE: '/quick-notes/tags/remove',
} as const;
