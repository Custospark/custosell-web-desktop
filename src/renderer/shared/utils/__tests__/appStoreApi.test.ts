import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QueryClient } from '@tanstack/react-query';

vi.mock('../../../app/api/axiosConfig', () => ({
  axiosInstance: {
    put: vi.fn(),
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import { axiosInstance } from '../../../app/api/axiosConfig';
import { AUTH } from '../../api/endpoints/endpoints';
import { saveStoreApps } from '../../components/layout/appStoreApi';

const put = axiosInstance.put as unknown as ReturnType<typeof vi.fn>;
const post = axiosInstance.post as unknown as ReturnType<typeof vi.fn>;
const get = axiosInstance.get as unknown as ReturnType<typeof vi.fn>;

const freshUser = { id: 7, modules: ['dashboard', 'sales', 'settings'], preferences: { hidden_store_apps: ['guide'] } };

function deps() {
  return {
    dispatch: vi.fn(),
    queryClient: { invalidateQueries: vi.fn() } as unknown as QueryClient,
  };
}

describe('saveStoreApps - one shared save for store + onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    put.mockResolvedValue({ data: { id: 7 } });
    post.mockResolvedValue({ data: {} });
    get.mockResolvedValue({ data: freshUser });
  });

  it('calls the same endpoints in order: profile, visibility, then authoritative refresh', async () => {
    const order: string[] = [];
    put.mockImplementation(async () => { order.push('put'); return { data: {} }; });
    post.mockImplementation(async () => { order.push('post'); return { data: {} }; });
    get.mockImplementation(async () => { order.push('get'); return { data: freshUser }; });

    const result = await saveStoreApps(
      { modules: ['dashboard', 'sales', 'settings'], hidden: ['guide'], userId: 7 },
      deps(),
    );

    expect(order).toEqual(['put', 'post', 'get']);
    expect(put).toHaveBeenCalledWith(AUTH.PROFILE, { modules: ['dashboard', 'sales', 'settings'] });
    expect(post).toHaveBeenCalledWith(AUTH.STORE_VISIBILITY, { hidden: ['guide'] });
    expect(result).toEqual({ modulesSaved: true, visibilitySaved: true, user: freshUser });
  });

  it('dispatches the fresh server user so the sidebar resolves from server truth', async () => {
    const { dispatch } = deps();
    await saveStoreApps({ hidden: ['guide'], userId: 7 }, { dispatch, queryClient: deps().queryClient });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'auth/setUser', payload: freshUser }),
    );
  });

  it('skips legs that were omitted', async () => {
    const result = await saveStoreApps({ hidden: [], userId: 7 }, deps());
    expect(put).not.toHaveBeenCalled();
    expect(post).toHaveBeenCalledTimes(1);
    expect(result.modulesSaved).toBe(false);
    expect(result.visibilitySaved).toBe(true);
  });

  it('throws when a leg fails so callers keep staged picks', async () => {
    post.mockRejectedValue(new Error('offline'));
    await expect(saveStoreApps({ hidden: ['guide'], userId: 7 }, deps())).rejects.toThrow('offline');
  });
});
