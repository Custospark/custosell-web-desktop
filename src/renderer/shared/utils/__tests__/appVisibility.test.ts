import { beforeEach, describe, expect, it } from 'vitest';
import { resolveAccessibleNavGroups } from '../../components/layout/resolveAccessibleNavLeaves';
import {
  getHiddenStoreApps,
  isStoreAppHidden,
} from '../../components/layout/storeAppVisibility';
import { getPlanAccessibleModules } from '../moduleAccess';
import type { AuthUser } from '../../../app/store/slices/authSlice';

function staffUser(hidden: string[]): AuthUser {
  return {
    id: 9,
    business_id: 1,
    location_id: null,
    role_id: 2,
    name: 'Test Staff',
    email: 'staff@test.com',
    phone: null,
    is_active: true,
    business_name: 'Test Biz',
    business: {
      id: 1,
      name: 'Test Biz',
      slug: 'test-biz',
      email: null,
      phone: null,
      website: null,
      address: null,
      city: null,
      state: null,
      postal_code: null,
      country: 'UG',
      tax_id: null,
      description: null,
      business_email: null,
      business_phone: null,
      timezone: null,
      business_type: 'business',
      currency: 'UGX',
      receipt_footer: null,
      logo_path: null,
      status: 'active',
      owner_id: 1,
      subscription: {
        id: 1,
        plan_id: 1,
        status: 'active',
        plan_features: {
          dashboard: true,
          sales: true,
          inventory: true,
          customers: true,
          pipeline: true,
          estimates: true,
          expenses: true,
          accounting: true,
          forecasting: true,
          documents: true,
          hr: true,
          settings: true,
        },
      },
    },
    role: null,
    is_platform_admin: false,
    is_business_owner: false,
    account_type: 'business',
    modules: ['dashboard', 'sales', 'inventory', 'customers'],
    accessible_modules: [],
    project_member_ids: [],
    last_login_at: null,
    email_verified_at: null,
    two_factor_enabled: false,
    onboarding: null,
    preferences: { hidden_store_apps: hidden },
    active_plans: [],
  } as unknown as AuthUser;
}

describe('everyday app visibility', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('prefers server prefs over the local mirror', () => {
    localStorage.setItem('custosell:hidden-store-apps:9', JSON.stringify(['account']));
    expect(getHiddenStoreApps(staffUser(['discover']))).toEqual(new Set(['discover']));
  });

  it('reports hidden everyday apps', () => {
    const user = staffUser(['discover', 'guide']);
    expect(isStoreAppHidden(user, 'discover')).toBe(true);
    expect(isStoreAppHidden(user, 'account')).toBe(false);
  });

  it('drops hidden everyday groups from the staff sidebar', () => {
    const user = staffUser(['discover']);
    const groups = resolveAccessibleNavGroups(user, getPlanAccessibleModules(user));
    const labels = groups.map((g) => g.label);
    expect(labels).not.toContain('Online Shopping');
    expect(labels).toContain('Dashboard');
  });

  it('shows selected (granted, visible) apps in the sidebar', () => {
    const user = staffUser([]);
    const groups = resolveAccessibleNavGroups(user, getPlanAccessibleModules(user));
    const labels = groups.map((g) => g.label);
    expect(labels).toContain('Dashboard');
    expect(labels).toContain('Online Shopping');
  });

  it('keeps everyday groups when nothing is hidden', () => {
    const user = staffUser([]);
    const groups = resolveAccessibleNavGroups(user, getPlanAccessibleModules(user));
    expect(groups.map((g) => g.label)).toContain('Online Shopping');
  });

  it('filters hidden apps for business owners too - everyday and workspace', () => {
    const owner: AuthUser = {
      ...staffUser(['discover', 'account', 'guide', 'inventory']),
      is_business_owner: true,
      modules: ['dashboard', 'sales', 'inventory', 'settings'],
      business: {
        ...(staffUser([]).business as object),
        owner_id: 9,
      },
    } as unknown as AuthUser;
    const groups = resolveAccessibleNavGroups(owner, getPlanAccessibleModules(owner));
    const labels = groups.map((g) => g.label);
    expect(labels).not.toContain('Online Shopping');
    expect(labels).not.toContain('Custosell Guide');
    expect(labels).not.toContain('Account');
    expect(labels).not.toContain('Inventory & Supply Chain');
    expect(labels).toContain('Dashboard');
    expect(labels).toContain('Settings');
  });
});
