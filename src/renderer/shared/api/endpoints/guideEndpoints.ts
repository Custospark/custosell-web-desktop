export const GUIDE = {
  TUTORIALS: '/guide/tutorials',
  FAQS: '/guide/faqs',
  COMMUNITIES: '/guide/communities',
  PUBLIC_FAQS: '/public/faqs',
  FEEDBACK: '/guide/feedback',
  FEEDBACK_MINE: '/guide/feedback/mine',
  FEEDBACK_ITEM: (id: number) => `/guide/feedback/${id}`,
  FEEDBACK_BULK_DELETE: '/guide/feedback/bulk-delete',
} as const;
