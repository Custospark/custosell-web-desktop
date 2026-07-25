import type { NotificationChannel } from '../../notifications/api/NotificationTypes';

export type { NotificationChannel };

export type ActivityStatus = 'active' | 'dormant' | 'churned' | 'never_used' | 'suspended';

export type BusinessAccountStatus = 'active' | 'warning' | 'restricted' | 'suspended' | 'notified';

export type BusinessNotificationIntention =
  | 'announcement'
  | 'warning_notice'
  | 'payment_reminder'
  | 'policy_update'
  | 'reactivation_nudge'
  | 'custom';

export interface PlatformBusiness {
  id: number;
  name: string;
  slug: string;
  email: string | null;
  currency: string;
  status: BusinessAccountStatus;
  status_changed_at: string | null;
  activity_status: ActivityStatus;
  last_sale_at: string | null;
  last_login_at: string | null;
  days_since_activity: number | null;
  activity_active_days: number;
  activity_dormant_days: number;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  plan_name: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  staff_count: number;
  gross_sales_today: string;
  gross_sales_7d: string;
  gross_sales_30d: string;
  gross_sales_all_time: string;
  transactions_30d: number;
  total_stock: number;
  last_activity_at: string | null;
  created_at: string | null;
}

export interface GrossIncomeTier {
  tier: number;
  label: string;
  min_gross: string;
  max_gross: string;
  business_count: number;
  total_gross_sales_30d: string;
}

export interface GrossIncomeDistribution {
  currency: string;
  tiers: GrossIncomeTier[];
  decision_note: string;
}

export interface PlatformOverview {
  businesses: {
    total: number;
    active: number;
    dormant: number;
    churned: number;
    never_used: number;
    suspended: number;
    with_gross_sales_30d: number;
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
  pricing_insights: {
    activity_window_days: number;
    businesses_with_gross_sales_30d: number;
    businesses_without_gross_sales_30d: number;
    gross_income_distribution: GrossIncomeDistribution[];
  };
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
  gross_sales: string;
}

export interface PlatformBusinessGrowthDay {
  date: string;
  signups: number;
  cumulative: number;
}

export interface PlatformBusinessStats {
  onboarding: {
    today: number;
    this_week: number;
    this_month: number;
    in_range: number;
    range_from: string;
    range_to: string;
  };
  totals: {
    total: number;
    active_status: number;
    warning: number;
    notified: number;
    restricted: number;
    suspended: number;
    with_gross_sales_30d: number;
    transactions_30d: number;
    gross_sales_30d: string;
  };
  growth: PlatformBusinessGrowthDay[];
  decisions: string[];
}

export interface PaginatedPlatformResponse<T> {
  current_page: number;
  data: T[];
  total: number;
  per_page: number;
  last_page: number;
}

export interface PlatformUser {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  is_active: boolean;
  status?: UserAccountStatus;
  status_changed_at?: string | null;
  business_id: number | null;
  business_name: string | null;
  role_name?: string | null;
  is_platform_admin: boolean;
  platform_roles?: string[];
  last_login_at: string | null;
  days_since_login?: number | null;
  created_at: string | null;
}

export type UserAccountStatus = 'active' | 'warning' | 'notified' | 'restricted' | 'deactivated';

export type UserNotificationIntention =
  | 'announcement'
  | 'warning_notice'
  | 'policy_update'
  | 'reactivation_nudge'
  | 'account_notice'
  | 'custom';

export type UserLoginActivity = 'active' | 'dormant' | 'churned' | 'never_logged_in';

export interface PlatformUserGrowthDay {
  date: string;
  signups: number;
  cumulative: number;
}

export interface PlatformUserStats {
  onboarding: {
    today: number;
    this_week: number;
    this_month: number;
    in_range: number;
    range_from: string;
    range_to: string;
  };
  totals: {
    total: number;
    active: number;
    warning: number;
    notified: number;
    restricted: number;
    deactivated: number;
    with_business: number;
    platform_admins: number;
    logins_30d: number;
  };
  growth: PlatformUserGrowthDay[];
  decisions: string[];
}

export interface PlatformRole {
  id: number;
  name: string;
  permissions: string[];
}

export interface PlatformSubscription {
  id: number;
  business_id: number;
  plan_id: number;
  business?: { id: number; name: string; slug?: string | null };
  plan?: {
    id: number; name: string; slug?: string | null;
    price_monthly?: number | null; price_yearly?: number | null;
    onboarding_fee_ugx?: number | null; onboarding_fee_usd?: number | null;
    trial_days?: number | null;
  };
  status: 'trial' | 'active' | 'past_due' | 'suspended' | 'cancelled' | 'expired';
  billing_cycle?: string | null;
  starts_at?: string | null;
  trial_ends_at?: string | null;
  ends_at?: string | null;
  next_billing_date?: string | null;
  cancelled_at?: string | null;
  suspended_at?: string | null;
  onboarding_fee_paid?: boolean;
  created_at?: string | null;
}

export type PlatformDispatchType = 'message' | 'status_change';
export type PlatformDispatchTargetKind = 'user' | 'business';

export interface PlatformDispatchActor {
  id: number;
  name: string;
  email: string;
}

export interface PlatformDispatchRecipient {
  type: PlatformDispatchTargetKind;
  id: number;
  name?: string | null;
  email?: string | null;
  business_id?: number | null;
  business_name?: string | null;
  owner_name?: string | null;
  owner_email?: string | null;
  in_app_recipient_count?: number | null;
}

export interface PlatformNotificationDispatchListItem {
  id: number;
  dispatch_type: PlatformDispatchType;
  target_kind: PlatformDispatchTargetKind;
  intention: string | null;
  subject: string | null;
  message_preview: string;
  channel: NotificationChannel;
  status_from: string | null;
  status_to: string | null;
  mark_as_notified: boolean;
  recipient_count: number;
  recipient_summary: string;
  actor: PlatformDispatchActor | null;
  sent_at: string | null;
  created_at: string | null;
}

export interface PlatformNotificationDispatchDetail extends PlatformNotificationDispatchListItem {
  message: string;
  recipients: PlatformDispatchRecipient[];
  metadata: Record<string, unknown> | null;
}

