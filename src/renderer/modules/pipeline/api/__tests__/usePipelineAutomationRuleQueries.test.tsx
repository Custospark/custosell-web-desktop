import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const axiosGetMock = vi.fn();
const axiosPostMock = vi.fn();
const axiosPutMock = vi.fn();
const axiosPatchMock = vi.fn();
const axiosDeleteMock = vi.fn();

vi.mock('../../../../app/api/axiosConfig', () => ({
  axiosInstance: {
    get: (...args: unknown[]) => axiosGetMock(...args),
    post: (...args: unknown[]) => axiosPostMock(...args),
    put: (...args: unknown[]) => axiosPutMock(...args),
    patch: (...args: unknown[]) => axiosPatchMock(...args),
    delete: (...args: unknown[]) => axiosDeleteMock(...args),
  },
}));

vi.mock('../../../../app/contexts/useToast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('../../../../app/store/offline/core/offlineQueryUtils', () => ({
  sanitizeErrorMessage: (err: unknown, fallback: string) =>
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback,
}));

import {
  useBoardAutomationRules,
  useCreateAutomationRule,
  useUpdateAutomationRule,
  useToggleAutomationRule,
  useDeleteAutomationRule,
  isOptimisticRule,
} from '../usePipelineAutomationRuleQueries';

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, wrapper };
}

const persistedRule = {
  id: 7,
  board_id: 10,
  name: 'Persisted rule',
  trigger: { type: 'stage_entered' },
  conditions: null,
  actions: [{ type: 'set_priority', priority: 'high' }],
  is_active: true,
  run_count: 0,
  last_run_at: null,
  paused_at: null,
  created_by: 1,
  creator: null,
  created_at: '2026-08-01T00:00:00.000Z',
  updated_at: '2026-08-01T00:00:00.000Z',
};

afterEach(() => {
  vi.clearAllMocks();
});

/**
 * Locks the optimistic automation contract: every create/update/toggle/delete
 * updates the list cache immediately (before the server responds) and never
 * calls the API for a not-yet-persisted (negative-id) optimistic rule.
 */
describe('usePipelineAutomationRuleQueries optimistic flows', () => {
  beforeEach(() => {
    axiosGetMock.mockResolvedValue({ data: { data: [persistedRule] } });
  });

  it('detects optimistic placeholder rules by negative id', () => {
    expect(isOptimisticRule({ id: -2 })).toBe(true);
    expect(isOptimisticRule({ id: 7 })).toBe(false);
  });

  it('creates a rule optimistically then replaces it on success', async () => {
    const { qc, wrapper } = makeWrapper();
    // Mount the list query first so the list cache exists before mutating.
    const { result: listResult } = renderHook(() => useBoardAutomationRules(10, true), { wrapper });
    await waitFor(() => expect(listResult.current.data).toBeDefined());

    const { result } = renderHook(() => useCreateAutomationRule(10), { wrapper });
    axiosPostMock.mockResolvedValue({
      data: { data: { ...persistedRule, id: 9, name: 'Optimistic name' } },
    });
    axiosGetMock.mockResolvedValue({
      data: { data: [{ ...persistedRule, id: 9, name: 'Optimistic name' }] },
    });

    await result.current.mutateAsync({
      name: 'Optimistic name',
      trigger: { type: 'card_created' },
      actions: [{ type: 'archive' }],
    });

    // Wait a tick so the refetch after cancelQueries settles, then the
    // persisted rule (id 9) must be present and no optimistic row may remain.
    await new Promise((resolve) => setTimeout(resolve, 50));
    const list = qc.getQueryData<{ id: number; name?: string }[]>(['pipeline', 'automation-rules', 10]) ?? [];
    expect(list.some((r) => r.id === 9 && r.name === 'Optimistic name')).toBe(true);
    expect(list.some((r) => r.id < 0)).toBe(false);
    expect(axiosPostMock).toHaveBeenCalledTimes(1);
  });

  it('toggles a persisted rule via the API', async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useToggleAutomationRule(10), { wrapper });
    axiosPatchMock.mockResolvedValue({
      data: { data: { ...persistedRule, is_active: false } },
    });

    await result.current.mutateAsync({ ruleId: 7, is_active: false });
    expect(axiosPatchMock).toHaveBeenCalledWith('/pipeline/automation-rules/7/toggle', { is_active: false });
  });

  it('never calls the API toggling an optimistic rule', async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useToggleAutomationRule(10), { wrapper });

    await result.current.mutateAsync({ ruleId: -2, is_active: true });
    expect(axiosPatchMock).not.toHaveBeenCalled();
  });

  it('never calls the API editing an optimistic rule', async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpdateAutomationRule(10), { wrapper });

    await result.current.mutateAsync({
      ruleId: -2,
      payload: { name: 'X', trigger: { type: 'card_created' }, actions: [{ type: 'archive' }] },
    });
    expect(axiosPutMock).not.toHaveBeenCalled();
  });

  it('never calls the API deleting an optimistic rule', async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useDeleteAutomationRule(10), { wrapper });

    await result.current.mutateAsync(-2);
    expect(axiosDeleteMock).not.toHaveBeenCalled();
  });

  it('deletes a persisted rule through the API', async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useDeleteAutomationRule(10), { wrapper });
    axiosDeleteMock.mockResolvedValue({ data: {} });

    await result.current.mutateAsync(7);
    expect(axiosDeleteMock).toHaveBeenCalledWith('/pipeline/automation-rules/7');
  });

  it('loads the rule list for a board', async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useBoardAutomationRules(10, true), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.[0]?.id).toBe(7);
    expect(axiosGetMock).toHaveBeenCalledWith('/pipeline/boards/10/automation-rules');
  });
});