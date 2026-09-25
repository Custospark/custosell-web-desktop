import { describe, expect, it } from 'vitest';
import { getNextVisibleAppRoute } from '../../components/layout/moduleLauncherCatalog';
import { getDefaultRoute } from '../moduleAccess';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import type { AuthUser } from '../../../app/store/slices/authSlice';

function businessUser(hidden: string[]): AuthUser {
  return {
    id: 11,
    business_id: 11,
    name: 'Owner',
    email: 'owner@test.com',
    is_business_owner: true,
    account_type: 'business',
    modules: ['dashboard', 'sales', 'inventory', 'settings'],
    business: {
      id: 11,
      owner_id: 11,
      subscription: {
        id: 1,
        status: 'active',
        plan_features: {
          dashboard: true,
          sales: true,
          inventory: true,
          settings: true,
        },
      },
    },
    preferences: { hidden_store_apps: hidden },
  } as unknown as AuthUser;
}

describe('getNextVisibleAppRoute', () => {
  it('opens the default page of the next visible module after a hidden one', () => {
    const user = businessUser(['sales']);
    expect(getNextVisibleAppRoute(user, new Set(['sales']), 'sales')).toBe(ROUTES.INVENTORY.OVERVIEW);
  });

  it('wraps around to an earlier module when nothing later is visible', () => {
    const user = businessUser(['inventory', 'settings', 'discover', 'account', 'guide']);
    expect(
      getNextVisibleAppRoute(
        user,
        new Set(['inventory', 'settings', 'discover', 'account', 'guide']),
        'inventory',
      ),
    ).toBe(ROUTES.DASHBOARD);
  });

  it('falls back to the default route when nothing else is visible', () => {
    const hidden = ['dashboard', 'sales', 'inventory', 'discover', 'account', 'guide', 'settings'];
    const user = businessUser(hidden);
    expect(getNextVisibleAppRoute(user, new Set(hidden), 'sales')).toBe(getDefaultRoute(user));
  });
});
