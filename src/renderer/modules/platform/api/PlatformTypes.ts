export type ActivityStatus = 'active' | 'dormant' | 'never_used' | 'suspended';

export interface PlatformBusiness {
  id: number;
  name: string;
  slug: string;
  email: string | null;
  currency: string;
  status: 'active' | 'suspended';
  activity_status: ActivityStatus;
  owner_name: string | null;
  owner_email: string | null;
  plan_name: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  staff_count: number;
  revenue_today: string;
  revenue_7d: string;
  revenue_30d: string;
  revenue_all_time: string;
  transactions_30d: number;
  last_activity_at: string | null;
  created_at: string | null;
}

export interface PlatformOverview {
  businesses: {
    total: number;
    active: number;
    dormant: number;
    never_used: number;
    suspended: number;
  };
  users: {
    total: number;
    active: number;
    deactivated: number;
  };
  system: {
    api_status: string;
    database_latency_ms: number;
    queue_pending: number;
    version: string;
  };
  revenue_by_currency: Array<{
    currency: string;
    revenue_30d: string;
    business_count: number;
  }>;
  top_businesses_30d: PlatformBusiness[];
  recent_events: Array<{
    id: number;
    action: string;
    target_type: string;
    target_id: number;
    reason: string | null;
    actor_name: string | null;
    created_at: string | null;
  }>;
}

export interface PlatformMetricDay {
  date: string;
  signups: number;
  transactions: number;
  active_businesses: number;
}

export interface PlatformUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  business_id: number | null;
  business_name?: string | null;
  role_name?: string | null;
  platform_roles?: string[];
  is_platform_admin: boolean;
  last_login_at: string | null;
  created_at: string | null;
}

export interface PlatformRole {
  id: number;
  name: string;
  permissions: string[];
}

export interface PaginatedPlatformResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}
