import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../../app/api/axiosConfig';
import { useToast } from '../../../../app/contexts/useToast';
import { isNetworkFailure, sanitizeErrorMessage } from '../../../../app/store/offline/core/offlineQueryUtils';
import { readWithOfflineStrategy } from '../../../../app/store/offline/core/offlineReadStrategy';
import {
  completeOfflineCancelOrderInstant,
  completeOfflineCreateOrderInstant,
  completeOfflineUpdateOrderInstant,
  shouldCompleteOrderLocally,
} from '../../../../app/store/offline/sales/completeOfflineOrder';
import { localOrdersStore, toOrderWithSyncMeta } from '../../../../app/store/offline/sales/localOrdersStore';
import { ORDERS } from './orderEndpoints';
import { ORDER_LIST_POLL_MS, orderKeys } from './orderQueryKeys';
import type { CreateOrderPayload, PosOrder, UpdateOrderPayload } from './orderTypes';

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && 'data' in data) {
    const inner = (data as { data: unknown }).data;
    if (Array.isArray(inner)) return inner as T[];
    // Laravel ResourceCollection sometimes nests as { data: { data: [...] } }
    if (inner && typeof inner === 'object' && 'data' in inner && Array.isArray((inner as { data: unknown }).data)) {
      return (inner as { data: T[] }).data;
    }
  }
  return [];
}

function unwrapEntity<T>(data: unknown): T {
  if (data && typeof data === 'object' && 'data' in data) {
    return (data as { data: T }).data;
  }
  return data as T;
}

async function loadLocalPendingOrders(): Promise<PosOrder[]> {
  const pending = await localOrdersStore.getPending();
  return pending
    .filter((r) => r.mutationType !== 'cancel' || r.order.status === 'cancelled')
    .map(toOrderWithSyncMeta);
}

function mergeOrders(base: PosOrder[] = [], local: PosOrder[] = []): PosOrder[] {
  const localIds = new Set(local.map((o) => o.id));
  return [...local, ...base.filter((o) => !localIds.has(o.id))];
}

export function useOrders(
  filters?: { status?: string; q?: string; source?: string },
  enabled = true,
  options?: { poll?: boolean },
) {
  const poll = options?.poll === true && enabled;
  return useQuery({
    queryKey: orderKeys.list(filters),
    queryFn: async () => {
      const local = await loadLocalPendingOrders().catch(() => [] as PosOrder[]);
      return readWithOfflineStrategy({
        fetchFromServer: async () => {
          const { data } = await axiosInstance.get(ORDERS.INDEX, { params: filters });
          const remote = unwrapList<PosOrder>(data);
          let merged = mergeOrders(remote, local);
          if (filters?.status) {
            merged = merged.filter((o) => o.status === filters.status);
          }
          if (filters?.source) {
            merged = merged.filter((o) => (o.source ?? 'pos') === filters.source);
          }
          if (filters?.q?.trim()) {
            const q = filters.q.trim().toLowerCase();
            merged = merged.filter(
              (o) =>
                o.order_number.toLowerCase().includes(q)
                || (o.customer_name ?? '').toLowerCase().includes(q)
                || (o.customer_phone ?? '').toLowerCase().includes(q)
                || (o.notes ?? '').toLowerCase().includes(q),
            );
          }
          return merged;
        },
        readFromClient: async () => {
          let list = local;
          if (filters?.status) list = list.filter((o) => o.status === filters.status);
          if (filters?.source) list = list.filter((o) => (o.source ?? 'pos') === filters.source);
          if (filters?.q?.trim()) {
            const q = filters.q.trim().toLowerCase();
            list = list.filter(
              (o) =>
                o.order_number.toLowerCase().includes(q)
                || (o.customer_name ?? '').toLowerCase().includes(q)
                || (o.customer_phone ?? '').toLowerCase().includes(q)
                || (o.notes ?? '').toLowerCase().includes(q),
            );
          }
          return list;
        },
      });
    },
    enabled,
    refetchInterval: poll ? ORDER_LIST_POLL_MS : false,
    refetchIntervalInBackground: true,
  });
}

export function useOpenOrders(enabled = true) {
  return useOrders({ status: 'open' }, enabled);
}

export function useOrder(id: number, enabled = true) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get(ORDERS.DETAIL(id));
      return unwrapEntity<PosOrder>(data);
    },
    enabled: enabled && id > 0,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (payload: CreateOrderPayload) => {
      if (shouldCompleteOrderLocally()) {
        return completeOfflineCreateOrderInstant(payload);
      }
      try {
        const { data } = await axiosInstance.post(ORDERS.INDEX, payload);
        return unwrapEntity<PosOrder>(data);
      } catch (err) {
        if (isNetworkFailure(err)) {
          return completeOfflineCreateOrderInstant(payload);
        }
        throw err;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: orderKeys.all });
      showToast('success', 'Order held');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not hold order'));
    },
  });
}

export function useUpdateOrder() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateOrderPayload & { id: number }) => {
      if (shouldCompleteOrderLocally() || id < 0) {
        const current = (qc.getQueryData<PosOrder[]>(orderKeys.list({ status: 'open' })) ?? [])
          .find((o) => o.id === id);
        if (!current) throw new Error('Order not found locally');
        return completeOfflineUpdateOrderInstant(current, payload);
      }
      try {
        const { data } = await axiosInstance.put(ORDERS.DETAIL(id), payload);
        return unwrapEntity<PosOrder>(data);
      } catch (err) {
        if (isNetworkFailure(err)) {
          const current = (qc.getQueryData<PosOrder[]>(orderKeys.list({ status: 'open' })) ?? [])
            .find((o) => o.id === id);
          if (!current) throw err;
          return completeOfflineUpdateOrderInstant(current, payload);
        }
        throw err;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: orderKeys.all });
      showToast('success', 'Order updated');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not update order'));
    },
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      if (shouldCompleteOrderLocally() || id < 0) {
        const lists = qc.getQueriesData<PosOrder[]>({ queryKey: orderKeys.all });
        const current = lists.flatMap(([, rows]) => rows ?? []).find((o) => o.id === id);
        if (!current) throw new Error('Order not found locally');
        return completeOfflineCancelOrderInstant(current);
      }
      try {
        const { data } = await axiosInstance.post(ORDERS.CANCEL(id));
        return unwrapEntity<PosOrder>(data);
      } catch (err) {
        if (isNetworkFailure(err)) {
          const lists = qc.getQueriesData<PosOrder[]>({ queryKey: orderKeys.all });
          const current = lists.flatMap(([, rows]) => rows ?? []).find((o) => o.id === id);
          if (!current) throw err;
          return completeOfflineCancelOrderInstant(current);
        }
        throw err;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: orderKeys.all });
      showToast('success', 'Order cancelled');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not cancel order'));
    },
  });
}
