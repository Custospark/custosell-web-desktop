import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import { DOCUMENTS } from './documentEndpoints';
import { documentKeys } from './documentQueryKeys';
import type {
  DocumentFolder,
  DocumentFolderContents,
  DocumentItem,
  DocumentListFilters,
  DocumentMemberRole,
  DocumentPaginationMeta,
  DocumentsVaultAppearance,
  DocumentTag,
  DocumentUserRef,
  DocumentVisibility,
  FolderVisibility,
  PaginatedDocuments,
} from './documentTypes';

const DEFAULT_META: DocumentPaginationMeta = {
  current_page: 1,
  last_page: 1,
  per_page: 50,
  total: 0,
};

function normalizeList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: T[] }).data;
  }
  return [];
}

function unwrapPaginated<T>(payload: unknown): PaginatedDocuments & { data: T[] } {
  if (payload && typeof payload === 'object') {
    const body = payload as { data?: T[]; meta?: DocumentPaginationMeta };
    if (Array.isArray(body.data)) {
      return {
        data: body.data,
        meta: body.meta ?? { ...DEFAULT_META, total: body.data.length },
      };
    }
  }

  const data = normalizeList<T>(payload);
  return { data, meta: { ...DEFAULT_META, total: data.length } };
}

function unwrapEntity<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in (payload as object)) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

export function useDocumentAccessibleMembers(enabled = true) {
  return useQuery({
    queryKey: documentKeys.members(),
    queryFn: async () => {
      const { data } = await axiosInstance.get(DOCUMENTS.ACCESSIBLE_MEMBERS);
      return normalizeList<DocumentUserRef>(data);
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useDocumentsVaultAppearance(enabled = true) {
  return useQuery({
    queryKey: documentKeys.vaultAppearance(),
    queryFn: async () => {
      const { data } = await axiosInstance.get(DOCUMENTS.VAULT_APPEARANCE);
      return unwrapEntity<DocumentsVaultAppearance>(data);
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useUpdateDocumentsVaultAppearance() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async (payload: Partial<DocumentsVaultAppearance>) => {
      const { data } = await axiosInstance.patch(DOCUMENTS.VAULT_APPEARANCE, payload);
      return unwrapEntity<DocumentsVaultAppearance>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: documentKeys.vaultAppearance() });
      showToast('success', 'Vault appearance updated');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not update vault appearance'));
    },
  });
}

export function useDocumentTags(query?: string, enabled = true) {
  return useQuery({
    queryKey: documentKeys.tags(query),
    queryFn: async () => {
      const { data } = await axiosInstance.get(DOCUMENTS.TAGS, { params: query ? { q: query } : undefined });
      return normalizeList<DocumentTag>(data);
    },
    enabled,
    staleTime: 30_000,
  });
}

export function useDocumentFolderTree(enabled = true) {
  return useQuery({
    queryKey: documentKeys.tree(),
    queryFn: async () => {
      const { data } = await axiosInstance.get(DOCUMENTS.FOLDERS_TREE);
      return normalizeList<DocumentFolder>(data);
    },
    enabled,
    staleTime: 15_000,
  });
}

export function useDocumentFolderChildren(
  parentId: number | null,
  page = 1,
  enabled = true,
) {
  return useQuery({
    queryKey: documentKeys.folderChildren(parentId, page),
    queryFn: async () => {
      const { data } = await axiosInstance.get(DOCUMENTS.FOLDERS_CHILDREN, {
        params: {
          ...(parentId != null ? { parent_id: parentId } : {}),
          page,
        },
      });
      return unwrapPaginated<DocumentFolder>(data);
    },
    enabled,
    staleTime: 15_000,
  });
}

export function useDocumentFolderContents(folderId: number, page = 1, enabled = true) {
  return useQuery({
    queryKey: documentKeys.contents(folderId, page),
    queryFn: async () => {
      const { data } = await axiosInstance.get(DOCUMENTS.FOLDER_CONTENTS(folderId), {
        params: { page },
      });
      return unwrapEntity<DocumentFolderContents>(data);
    },
    enabled: enabled && folderId > 0,
    staleTime: 10_000,
  });
}

export function useDocuments(filters: DocumentListFilters = {}, enabled = true) {
  return useInfiniteQuery({
    queryKey: documentKeys.list(filters),
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await axiosInstance.get(DOCUMENTS.LIST, {
        params: { ...filters, page: pageParam },
      });
      return unwrapPaginated<DocumentItem>(data);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (
      lastPage.meta.current_page < lastPage.meta.last_page
        ? lastPage.meta.current_page + 1
        : undefined
    ),
    enabled,
    staleTime: 10_000,
  });
}

export function useDocument(id: number, enabled = true) {
  return useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get(DOCUMENTS.BY_ID(id));
      return unwrapEntity<DocumentItem>(data);
    },
    enabled: enabled && id > 0,
  });
}

type FolderPayload = {
  name: string;
  description?: string | null;
  visibility: FolderVisibility;
  parent_id?: number | null;
  member_user_ids?: number[];
  member_roles?: Record<number, DocumentMemberRole>;
  cover_color?: string | null;
};

export function useCreateDocumentFolder() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async (payload: FolderPayload) => {
      const { data } = await axiosInstance.post(DOCUMENTS.FOLDERS, payload);
      return unwrapEntity<DocumentFolder>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: documentKeys.all });
      showToast('success', 'Folder created');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not create folder'));
    },
  });
}

export function useUpdateDocumentFolder() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<FolderPayload> & { id: number }) => {
      const { data } = await axiosInstance.patch(DOCUMENTS.FOLDER(id), payload);
      return unwrapEntity<DocumentFolder>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: documentKeys.all });
      showToast('success', 'Folder updated');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not update folder'));
    },
  });
}

export function useDeleteDocumentFolder() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.delete(DOCUMENTS.FOLDER(id));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: documentKeys.all });
      showToast('success', 'Folder deleted');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not delete folder'));
    },
  });
}

type DocumentPayload = {
  title?: string;
  description?: string | null;
  visibility?: DocumentVisibility;
  folder_id?: number | null;
  member_user_ids?: number[];
  member_roles?: Record<number, DocumentMemberRole>;
  customer_id?: number | null;
  project_id?: number | null;
  clear_customer?: boolean;
  clear_project?: boolean;
  tags?: string[];
  url?: string;
};

export function useUploadDocument() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async (payload: DocumentPayload & { file: File }) => {
      const form = new FormData();
      form.append('file', payload.file);
      if (payload.title) form.append('title', payload.title);
      if (payload.description) form.append('description', payload.description);
      if (payload.visibility) form.append('visibility', payload.visibility);
      if (payload.folder_id != null) form.append('folder_id', String(payload.folder_id));
      if (payload.customer_id != null) form.append('customer_id', String(payload.customer_id));
      if (payload.project_id != null) form.append('project_id', String(payload.project_id));
      payload.member_user_ids?.forEach((id) => form.append('member_user_ids[]', String(id)));
      if (payload.member_roles) {
        Object.entries(payload.member_roles).forEach(([userId, role]) => {
          form.append(`member_roles[${userId}]`, role);
        });
      }
      payload.tags?.forEach((tag) => form.append('tags[]', tag));
      const { data } = await axiosInstance.post(DOCUMENTS.UPLOAD, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return unwrapEntity<DocumentItem>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: documentKeys.all });
      showToast('success', 'File uploaded');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Upload failed'));
    },
  });
}

export function useCreateDocumentLink() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async (payload: DocumentPayload & { title: string; url: string }) => {
      const { data } = await axiosInstance.post(DOCUMENTS.LINK, payload);
      return unwrapEntity<DocumentItem>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: documentKeys.all });
      showToast('success', 'Link added');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not add link'));
    },
  });
}

export function useUpdateDocument() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...payload }: DocumentPayload & { id: number }) => {
      const { data } = await axiosInstance.patch(DOCUMENTS.BY_ID(id), payload);
      return unwrapEntity<DocumentItem>(data);
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: documentKeys.all });
      void qc.invalidateQueries({ queryKey: documentKeys.detail(vars.id) });
      showToast('success', 'Document updated');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not update document'));
    },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.delete(DOCUMENTS.BY_ID(id));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: documentKeys.all });
      showToast('success', 'Document deleted');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not delete document'));
    },
  });
}

export function useRecordDocumentView() {
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await axiosInstance.post(DOCUMENTS.VIEW(id));
      return unwrapEntity<{ file_url?: string | null }>(data);
    },
  });
}

export function useRecordDocumentDownload() {
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await axiosInstance.post(DOCUMENTS.DOWNLOAD(id));
      return unwrapEntity<{ file_url?: string | null }>(data);
    },
  });
}
