import { describe, expect, it } from 'vitest';
import authReducer, { loginSuccess, switchAccount, logout } from '../authSlice';
import type { AuthUser } from '../authSlice';

function makeUser(id: number, email: string, businessId: number, businessName: string): AuthUser {
  return {
    id,
    email,
    name: `User ${id}`,
    phone: null,
    is_active: true,
    business_id: businessId,
    location_id: null,
    role_id: null,
    business_name: businessName,
    account_type: 'business',
    business: {
      id: businessId,
      name: businessName,
      slug: `business-${businessId}`,
      email: null,
      phone: null,
      website: null,
      address: null,
      city: null,
      state: null,
      postal_code: null,
      country: null,
      tax_id: null,
      description: null,
      business_email: null,
      business_phone: null,
      timezone: null,
      business_type: null,
      currency: 'UGX',
      receipt_footer: null,
      logo_path: null,
      status: 'active',
    },
  };
}

describe('authSlice.switchAccount', () => {
  it('replaces the active user with the target account context and mints its token', () => {
    const initial = authReducer(
      undefined,
      loginSuccess({
        user: makeUser(1, 'one@example.com', 10, 'Business One'),
        token: 'token-a',
      }),
    );

    const next = authReducer(
      initial,
      switchAccount({ user: makeUser(2, 'two@example.com', 20, 'Business Two'), token: 'token-b' }),
    );

    expect(next.user?.id).toBe(2);
    expect(next.user?.email).toBe('two@example.com');
    expect(next.businessId).toBe(20);
    expect(next.user?.business?.name).toBe('Business Two');
    // A fresh token is minted for the target account - each account has its own
    // session, so /auth/me and all requests are scoped to the active account.
    expect(next.token).toBe('token-b');
    expect(next.isAuthenticated).toBe(true);
  });

  it('resolves the active location from the target account', () => {
    const initial = authReducer(
      undefined,
      loginSuccess({
        user: makeUser(1, 'one@example.com', 10, 'Business One'),
        token: 'token-a',
      }),
    );

    const target = makeUser(2, 'two@example.com', 20, 'Business Two');
    target.locations = [
      { id: 3, name: 'Kampala', code: 'KLA', is_default: true },
      { id: 4, name: 'Entebbe', code: 'EBB', is_default: false },
    ];

    const next = authReducer(initial, switchAccount({ user: target, token: 'token-b' }));
    expect(next.activeLocationId).toBe(3);
  });

  it('clears pendingAuthSync so no stale sync from the old account runs', () => {
    const initial = authReducer(
      undefined,
      loginSuccess({
        user: makeUser(1, 'one@example.com', 10, 'Business One'),
        token: 'token-a',
        pendingAuthSync: true,
      }),
    );

    const next = authReducer(
      initial,
      switchAccount({ user: makeUser(2, 'two@example.com', 20, 'Business Two'), token: 'token-b' }),
    );

    expect(next.pendingAuthSync).toBe(false);
  });

  it('logout still clears the switched account', () => {
    const initial = authReducer(
      undefined,
      loginSuccess({
        user: makeUser(1, 'one@example.com', 10, 'Business One'),
        token: 'token-a',
      }),
    );

    const switched = authReducer(
      initial,
      switchAccount({ user: makeUser(2, 'two@example.com', 20, 'Business Two'), token: 'token-b' }),
    );
    const afterLogout = authReducer(switched, logout());

    expect(afterLogout.user).toBeNull();
    expect(afterLogout.token).toBeNull();
    expect(afterLogout.isAuthenticated).toBe(false);
  });
});
