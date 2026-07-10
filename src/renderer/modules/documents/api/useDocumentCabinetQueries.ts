import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import { DOCUMENTS } from './documentEndpoints';
import { documentKeys } from './documentQueryKeys';
import type {
  CabinetVisibility,
  DocumentCabinet,
  DocumentMemberRole,
  DocumentUserRef,
  PaginatedDocumentCabinets,
} from './documentTypes';

function unwrapEntity<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in (payload as object)) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

function unwrapPaginated<T>(payload: unknown): PaginatedDocumentCabinets & { data: T[] } {
  if (payload && typeof payload === 'object') {
    const body = payload as { data?: T[]; meta?: PaginatedDocumentCabinets['meta'] };
    if (Array.isArray(body.data)) {
      return {
        data: body.data,
        meta: body.meta ?? { current_page: 1, last_page: 1, per_page: 50, total: body.data.length },
      };
    }
  }
  return { data: [], meta: { current_page: 1, last_page: 1, per_page: 50, total: 0 } };
}

export function useDocumentCabinets(query?: string, enabled = true) {
  return useQuery({
    queryKey: documentKeys.cabinets(query),
    queryFn: async () => {
      const { data } = await axiosInstance.get(DOCUMENTS.CABINETS, {
        params: query ? { q: query, per_page: 200 } : { per_page: 200 },
      });
      return unwrapPaginated<DocumentCabinet>(data);
    },
    enabled,
    staleTime: 15_000,
  });
}

export function useDocumentCabinet(id: number, enabled = true) {
  return useQuery({
    queryKey: documentKeys.cabinet(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get(DOCUMENTS.CABINET(id));
      return unwrapEntity<DocumentCabinet>(data);
    },
    enabled: enabled && id > 0,
    staleTime: 15_000,
  });
}

type CabinetPayload = {
  name?: string;
  description?: string | null;
  visibility?: CabinetVisibility;
  cover_color?: string | null;
  background_type?: string | null;
  background_value?: string | null;
  member_user_ids?: number[];
  member_roles?: Record<number, DocumentMemberRole>;
};

type CreateCabinetPayload = CabinetPayload & {
  name: string;
  visibility: CabinetVisibility;
};

export function useCreateDocumentCabinet() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async (payload: CreateCabinetPayload) => {
      const { data } = await axiosInstance.post(DOCUMENTS.CABINETS, payload);
      return unwrapEntity<DocumentCabinet>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: documentKeys.all });
      showToast('success', 'Cabinet created');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not create cabinet'));
    },
  });
}

export function useUpdateDocumentCabinet() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<CabinetPayload> & { id: number }) => {
      const { data } = await axiosInstance.patch(DOCUMENTS.CABINET(id), payload);
      return unwrapEntity<DocumentCabinet>(data);
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: documentKeys.all });
      void qc.invalidateQueries({ queryKey: documentKeys.cabinet(vars.id) });
      showToast('success', 'Cabinet updated');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not update cabinet'));
    },
  });
}

export function useDeleteDocumentCabinet() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.delete(DOCUMENTS.CABINET(id));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: documentKeys.all });
      showToast('success', 'Cabinet deleted');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not delete cabinet'));
    },
  });
}

export function cabinetMemberPayload(members: DocumentUserRef[]) {
  const member_user_ids = members.map((member) => member.id);
  const member_roles = Object.fromEntries(
    members.map((member) => [member.id, (member.role ?? 'viewer') as DocumentMemberRole]),
  ) as Record<number, DocumentMemberRole>;
  return { member_user_ids, member_roles };
}
