import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Plan } from '../../../shared/types';
import type { StoredAuthSession } from '../offline/auth/secureStorage';
import { isLocalSessionToken } from '../offline/auth/secureStorage';

export interface SubscriptionInfo {
  id: number;
  plan_id: number;
  plan_name?: string | null;
  plan_slug?: string | null;
  plan_features?: Record<string, boolean> | null;
  plan_limits?: Record<string, number | null> | null;
  price_monthly_usd?: string | null;
  price_yearly_usd?: string | null;
  onboarding_fee_usd?: string | null;
  status: string;
  billing_cycle?: string | null;
  starts_at?: string | null;
  trial_ends_at?: string | null;
  grace_period_ends_at?: string | null;
  next_billing_date?: string | null;
  onboarding_fee_paid?: boolean;
  payment_action?: {
    required: boolean;
    intent: string | null;
    label: string | null;
    message: string | null;
  };
  referral?: {
    code: string | null;
    discount_type: string | null;
    discount_value: string | null;
    discount_duration_months: number | null;
    discount_applied: string | null;
    status: string | null;
  } | null;
}
export interface BusinessInfo {
  id: number;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  tax_id: string | null;
  tax_regime?: string | null;
  jurisdiction?: string | null;
  default_vat_rate?: number | string | null;
  prices_include_tax?: boolean | null;
  description: string | null;
  business_email: string | null;
  business_phone: string | null;
  timezone: string | null;
  business_type: string | null;
  currency: string | null;
  receipt_footer: string | null;
  payment_bank_name?: string | null;
  payment_bank_account_name?: string | null;
  payment_bank_account_number?: string | null;
  payment_bank_branch?: string | null;
  payment_mobile_money_provider?: string | null;
  payment_mobile_money_account_name?: string | null;
  payment_mobile_money_number?: string | null;
  payment_instructions?: string | null;
  logo_path: string | null;
  status: string;
  owner_id?: number | null;
  is_open_for_supply?: boolean;
  supply_headline?: string | null;
  storefront_enabled?: boolean;
  subscription?: SubscriptionInfo | null;
}
export interface AuthLocation {
  id: number;
  name: string;
  code: string;
  is_default: boolean;
}
export interface AuthUser {
  id: number;
  business_id: number | null;
  location_id?: number | null;
  role_id: number | null;
  name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  location?: AuthLocation | null;
  locations?: AuthLocation[];
  avatar?: string | null;
  business_name?: string | null;
  business?: BusinessInfo | null;
  shift_clock_in?: string | null;
  shift_id?: number | null;
  role?: { id: number; name: string; slug: string; permissions: Record<string, boolean> } | null;
  is_platform_admin?: boolean;
  platform_roles?: string[];
  is_business_owner?: boolean;
  account_type?: string;
  modules?: string[];
  accessible_modules?: string[];
  project_member_ids?: number[];
  last_login_at?: string | null;
  email_verified_at?: string | null;
  two_factor_enabled?: boolean;
  onboarding?: {
    is_owner: boolean;
    needs_intent: boolean;
    needs_tour: boolean;
    primary_intent: string | null;
    secondary_intent: string | null;
    intent_completed_at: string | null;
    intent_skipped_at: string | null;
    tour_step: number;
    tour_completed_at: string | null;
    tour_skipped_at: string | null;
  } | null;
  preferences?: Record<string, unknown> | null;
  active_plans?: Plan[];
}

interface AuthState {
  user: AuthUser | null;
  plans: Plan[];
  token: string | null;
  businessId: number | null;
  activeLocationId: number | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  isLocalSession: boolean;
  pendingAuthSync: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  plans: [],
  token: null,
  businessId: null,
  activeLocationId: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  isLocalSession: false,
  pendingAuthSync: false,
  error: null,
};

function normalizeAuthUser(user: AuthUser): AuthUser {
  if (user.business && 'data' in user.business) {
    user.business = (user.business as { data: BusinessInfo }).data;
  }
  if (!user.business_name && user.business?.name) {
    user.business_name = user.business.name;
  }
  return user;
}

function resolveDefaultLocationId(user: AuthUser): number | null {
  if (user.location_id) return user.location_id;
  const defaultLoc = user.locations?.find((loc) => loc.is_default);
  if (defaultLoc) return defaultLoc.id;
  const firstLoc = user.locations?.[0];
  return firstLoc?.id ?? null;
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart(state) {
      state.isLoading = true;
      state.error = null;
    },
    loginSuccess(state, action: PayloadAction<{ user: AuthUser; token: string; plans?: Plan[]; isLocalSession?: boolean; pendingAuthSync?: boolean }>) {
      const user = normalizeAuthUser({ ...action.payload.user });
      console.log('[DEBUG] loginSuccess - user.business?.subscription?.status:', user?.business?.subscription?.status);
      state.user = user;
      state.plans = action.payload.plans ?? [];
      state.token = action.payload.token;
      state.businessId = user.business_id;
      state.activeLocationId = resolveDefaultLocationId(user);
      state.isAuthenticated = true;
      state.isLoading = false;
      state.isInitialized = true;
      state.isLocalSession = action.payload.isLocalSession ?? isLocalSessionToken(action.payload.token);
      state.pendingAuthSync = action.payload.pendingAuthSync ?? false;
      state.error = null;
    },
    loginFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
    registerStart(state) {
      state.isLoading = true;
      state.error = null;
    },
    registerSuccess(state, action: PayloadAction<{ user: AuthUser; token: string; plans?: Plan[]; isLocalSession?: boolean; pendingAuthSync?: boolean }>) {
      const user = normalizeAuthUser({ ...action.payload.user });
      state.user = user;
      state.plans = action.payload.plans ?? [];
      state.token = action.payload.token;
      state.businessId = user.business_id;
      state.activeLocationId = resolveDefaultLocationId(user);
      state.isAuthenticated = true;
      state.isLoading = false;
      state.isInitialized = true;
      state.isLocalSession = action.payload.isLocalSession ?? isLocalSessionToken(action.payload.token);
      state.pendingAuthSync = action.payload.pendingAuthSync ?? false;
      state.error = null;
    },
    registerFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.businessId = null;
      state.activeLocationId = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.isInitialized = true;
      state.isLocalSession = false;
      state.pendingAuthSync = false;
      state.error = null;
    },
    hydrateAuth(state, action: PayloadAction<StoredAuthSession>) {
      const user = normalizeAuthUser({ ...action.payload.user });
      state.user = user;
      state.plans = action.payload.plans ?? [];
      state.token = action.payload.token;
      state.businessId = user.business_id;
      state.activeLocationId = resolveDefaultLocationId(user);
      state.isAuthenticated = true;
      state.isInitialized = true;
      state.isLocalSession = action.payload.isLocalSession;
      state.pendingAuthSync = action.payload.pendingAuthSync;
      state.isLoading = false;
      state.error = null;
    },
    setUser(state, action: PayloadAction<AuthUser>) {
      const user = normalizeAuthUser({ ...action.payload });
      const incomingSub = user.business?.subscription;
      const existingSub = state.user?.business?.subscription;
      console.log('[DEBUG] setUser - incoming sub status:', incomingSub?.status, 'existing sub status:', existingSub?.status);
      state.user = {
        ...state.user,
        ...user,
        business: user.business
          ? {
              ...state.user?.business,
              ...user.business,
              subscription: user.business.subscription ?? state.user?.business?.subscription,
            }
          : state.user?.business,
      };
      const finalSub = state.user?.business?.subscription;
      console.log('[DEBUG] setUser - FINAL sub status:', finalSub?.status, 'id:', finalSub?.id);
      state.businessId = user.business_id;
      if (state.activeLocationId == null) {
        state.activeLocationId = resolveDefaultLocationId(state.user);
      }
      state.isAuthenticated = true;
      state.isInitialized = true;
    },
    updateShiftContext(
      state,
      action: PayloadAction<{ shift_id: number | null; shift_clock_in: string | null }>,
    ) {
      if (!state.user) return;
      state.user.shift_id = action.payload.shift_id;
      state.user.shift_clock_in = action.payload.shift_clock_in;
    },
    setPlans(state, action: PayloadAction<Plan[]>) {
      state.plans = action.payload;
    },
    setBusiness(state, action: PayloadAction<BusinessInfo>) {
      if (state.user) {
        const incoming = action.payload;
        const existingSub = state.user.business?.subscription;
        console.log('[DEBUG] setBusiness - existing sub status:', existingSub?.status, '| incoming sub status:', incoming.subscription?.status);
        state.user.business = {
          ...state.user.business,
          ...incoming,
          // Never let business endpoint overwrite subscription - /auth/me is the source of truth
          subscription: state.user.business?.subscription ?? incoming.subscription,
        };
        console.log('[DEBUG] setBusiness - FINAL sub status:', state.user.business?.subscription?.status);
        state.user.business_name = incoming.name;
      }
    },
    setInitialized(state) {
      state.isInitialized = true;
    },
    setActiveLocation(state, action: PayloadAction<number | null>) {
      state.activeLocationId = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
});

export const {
  loginStart, loginSuccess, loginFailure,
  registerStart, registerSuccess, registerFailure,
  logout, hydrateAuth, setUser, setPlans, setBusiness, setInitialized, setActiveLocation, clearError, updateShiftContext,
} = authSlice.actions;

export default authSlice.reducer;

export function buildAuthStateFromStorage(): { token: string | null; user: AuthUser | null } {
  return { token: null, user: null };
}
