/** Notes page background options - mirrors the board background gallery (same image set + resolution). */
export const NOTES_BACKGROUND_IMAGES = [
  { id: 1, url: 'https://picsum.photos/id/10/1200/800', thumb: 'https://picsum.photos/id/10/400/300' },
  { id: 2, url: 'https://picsum.photos/id/15/1200/800', thumb: 'https://picsum.photos/id/15/400/300' },
  { id: 3, url: 'https://picsum.photos/id/26/1200/800', thumb: 'https://picsum.photos/id/26/400/300' },
  { id: 4, url: 'https://picsum.photos/id/28/1200/800', thumb: 'https://picsum.photos/id/28/400/300' },
  { id: 5, url: 'https://picsum.photos/id/36/1200/800', thumb: 'https://picsum.photos/id/36/400/300' },
  { id: 6, url: 'https://picsum.photos/id/40/1200/800', thumb: 'https://picsum.photos/id/40/400/300' },
  { id: 7, url: 'https://picsum.photos/id/44/1200/800', thumb: 'https://picsum.photos/id/44/400/300' },
  { id: 8, url: 'https://picsum.photos/id/48/1200/800', thumb: 'https://picsum.photos/id/48/400/300' },
  { id: 9, url: 'https://picsum.photos/id/50/1200/800', thumb: 'https://picsum.photos/id/50/400/300' },
  { id: 10, url: 'https://picsum.photos/id/57/1200/800', thumb: 'https://picsum.photos/id/57/400/300' },
  { id: 11, url: 'https://picsum.photos/id/63/1200/800', thumb: 'https://picsum.photos/id/63/400/300' },
  { id: 12, url: 'https://picsum.photos/id/68/1200/800', thumb: 'https://picsum.photos/id/68/400/300' },
  { id: 13, url: 'https://picsum.photos/id/100/1200/800', thumb: 'https://picsum.photos/id/100/400/300' },
  { id: 14, url: 'https://picsum.photos/id/116/1200/800', thumb: 'https://picsum.photos/id/116/400/300' },
  { id: 15, url: 'https://picsum.photos/id/145/1200/800', thumb: 'https://picsum.photos/id/145/400/300' },
  { id: 16, url: 'https://picsum.photos/id/164/1200/800', thumb: 'https://picsum.photos/id/164/400/300' },
  { id: 17, url: 'https://picsum.photos/id/169/1200/800', thumb: 'https://picsum.photos/id/169/400/300' },
  { id: 18, url: 'https://picsum.photos/id/180/1200/800', thumb: 'https://picsum.photos/id/180/400/300' },
  { id: 19, url: 'https://picsum.photos/id/191/1200/800', thumb: 'https://picsum.photos/id/191/400/300' },
  { id: 20, url: 'https://picsum.photos/id/201/1200/800', thumb: 'https://picsum.photos/id/201/400/300' },
] as const;

export const NOTES_BACKGROUND_COLORS: string[] = [
  '#0f172a',
  '#1e3a8a',
  '#166534',
  '#7f1d1d',
  '#713f12',
  '#4c1d95',
  '#831843',
  '#475569',
];

/** Default background: a gallery image (same as boards). */
export const NOTES_DEFAULT_BACKGROUND = {
  type: 'gallery',
  value: NOTES_BACKGROUND_IMAGES[3].url,
} as const;

export interface NotesBackground {
  type?: string;
  value?: string | null;
}

/** Read the per-user notes background from auth preferences. */
export function resolveNotesBackground(preferences: Record<string, unknown> | null | undefined): NotesBackground {
  const bg = preferences?.quick_notes_background as NotesBackground | undefined;
  return bg && bg.type ? bg : NOTES_DEFAULT_BACKGROUND;
}
