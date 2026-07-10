export type DocumentVisibility = 'inherit' | 'all_staff' | 'selected_staff' | 'owner_only';
export type FolderVisibility = 'inherit' | 'all_staff' | 'selected_staff' | 'owner_only';
export type DocumentMemberRole = 'viewer' | 'contributor' | 'manager';
export type DocumentItemType = 'file' | 'link' | 'image';

export interface DocumentUserRef {
  id: number;
  name: string;
  avatar?: string | null;
  role?: DocumentMemberRole;
}

export interface DocumentTag {
  id: number;
  name: string;
  slug: string;
}

export interface DocumentFolder {
  id: number;
  parent_id: number | null;
  name: string;
  description?: string | null;
  visibility: FolderVisibility;
  depth: number;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  creator?: DocumentUserRef | null;
  members?: DocumentUserRef[];
  children?: DocumentFolder[];
  subfolder_count?: number;
  document_count?: number;
  has_children?: boolean;
  breadcrumbs?: { id: number; name: string }[];
  can_view: boolean;
  can_contribute: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_manage: boolean;
  effective_visibility?: DocumentVisibility;
  inherited_from_folder_id?: number | null;
}

export interface DocumentItem {
  id: number;
  folder_id: number | null;
  type: DocumentItemType;
  title: string;
  description?: string | null;
  visibility: DocumentVisibility;
  url?: string | null;
  file_name?: string | null;
  file_path?: string | null;
  file_url?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  views_count: number;
  downloads_count: number;
  customer_id?: number | null;
  project_id?: number | null;
  customer?: { id: number; name: string } | null;
  project?: { id: number; name: string } | null;
  tags: DocumentTag[];
  created_at?: string;
  updated_at?: string;
  uploader?: DocumentUserRef | null;
  members?: DocumentUserRef[];
  can_view: boolean;
  can_contribute: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_manage: boolean;
  effective_visibility?: DocumentVisibility;
  inherited_from_folder_id?: number | null;
}

export interface DocumentPaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface DocumentFolderContents {
  folder: DocumentFolder;
  breadcrumbs: { id: number; name: string }[];
  folders: DocumentFolder[];
  folders_meta?: DocumentPaginationMeta;
  documents: DocumentItem[];
  documents_meta?: DocumentPaginationMeta;
}

export interface DocumentListFilters {
  q?: string;
  folder_id?: number;
  tag?: string;
  customer_id?: number;
  project_id?: number;
  type?: DocumentItemType;
  uploaded_by?: number;
  page?: number;
  per_page?: number;
}

export interface PaginatedDocuments {
  data: DocumentItem[];
  meta: DocumentPaginationMeta;
}

export interface DocumentMemberSelection {
  user_id: number;
  role: DocumentMemberRole;
}
