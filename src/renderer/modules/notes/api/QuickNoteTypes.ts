export interface QuickNoteAuthor {
  id: number;
  name: string;
}

export interface QuickNote {
  id: number;
  business_id: number;
  user_id: number;
  client_uuid: string;
  title: string;
  body: string | null;
  color: string | null;
  tag: string | null;
  is_shared: boolean;
  is_pinned: boolean;
  sort_order: number;
  author?: QuickNoteAuthor | null;
  created_at: string;
  updated_at: string;
}

export interface QuickNotePayload {
  title?: string;
  body?: string | null;
  color?: string | null;
  tag?: string | null;
  is_shared?: boolean;
  is_pinned?: boolean;
  sort_order?: number;
}

export type QuickNoteWithSyncMeta = QuickNote & {
  _pendingSync?: boolean;
  _optimistic?: boolean;
  _localId?: string;
  _lastError?: string;
};

export type QuickNoteMutationType = 'create' | 'update' | 'delete';

export interface LocalQuickNoteRecord {
  localId: string;
  businessId?: number;
  mutationId: string;
  mutationType: QuickNoteMutationType;
  note: QuickNote;
  payload: QuickNotePayload | { id: number };
  syncStatus: 'pending' | 'synced' | 'failed';
  serverId?: number;
  createdAt: string;
  syncedAt?: string;
  lastError?: string;
}
