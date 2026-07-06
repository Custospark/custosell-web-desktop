export type EstimateStatus =
  | 'draft'
  | 'sent'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'converted';

export type EstimateLineItemType = 'labor' | 'material' | 'equipment' | 'service' | 'travel' | 'permit' | 'subcontractor' | 'discount' | 'other';
export type MarkupType = 'none' | 'percent' | 'fixed';
export type DiscountType = 'percent' | 'fixed' | null;

export interface EstimateUserRef {
  id: number;
  name: string;
}

export interface EstimateCustomerRef {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
}

export interface EstimateInvoiceRef {
  id: number;
  invoice_number: string;
  status: string;
  total_amount: number;
  amount_paid: number;
  payments?: EstimatePaymentRef[];
}

export interface EstimatePaymentRef {
  id: number;
  receipt_number: string;
  amount: number;
  payment_method: string;
  balance_after: number;
  paid_at: string;
  notes?: string | null;
}

export interface EstimateProjectRef {
  id: number;
  project_number: string;
  name: string;
  status: string;
}

export interface EstimateLineItem {
  id?: number;
  estimate_id?: number;
  product_id: number | null;
  sort_order?: number;
  type: EstimateLineItemType;
  description: string;
  quantity: number;
  unit_cost: number;
  unit_price: number;
  markup_type: MarkupType;
  markup_value: number;
  total_cost: number;
  total_price: number;
  is_billable: boolean;
}

export interface EstimateVersion {
  id: number;
  estimate_id: number;
  version: number;
  snapshot: Record<string, unknown>;
  created_by: number;
  change_summary: string | null;
  created_at: string;
  creator?: EstimateUserRef;
}

export interface EstimateTemplateLineItem {
  type?: EstimateLineItemType;
  description: string;
  quantity?: number;
  unit_cost?: number;
  unit_price?: number;
  markup_type?: MarkupType;
  markup_value?: number;
  is_billable?: boolean;
  product_id?: number | null;
}

export interface EstimateTemplate {
  id: number;
  business_id: number;
  name: string;
  description: string | null;
  line_items_template: EstimateTemplateLineItem[];
  terms: string | null;
  default_tax_rate: number;
  is_active: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface Estimate {
  id: number;
  business_id: number;
  customer_id: number | null;
  pipeline_lead_id: number | null;
  project_id: number | null;
  invoice_id: number | null;
  parent_estimate_id: number | null;
  estimate_number: string;
  version: number;
  title: string;
  status: EstimateStatus;
  currency: string;
  subtotal: number;
  discount_type: DiscountType;
  discount_value: number;
  discount_amount: number;
  tax_rate: number;
  tax_total: number;
  total: number;
  cost_subtotal: number;
  gross_profit: number;
  margin_percent: number;
  valid_until: string | null;
  notes: string | null;
  terms: string | null;
  internal_notes: string | null;
  sent_at: string | null;
  approved_at: string | null;
  approved_by_name: string | null;
  rejection_reason: string | null;
  email_sent_count: number;
  last_emailed_at: string | null;
  created_by: number;
  assigned_to: number | null;
  created_at: string;
  updated_at: string;
  customer?: EstimateCustomerRef | null;
  creator?: EstimateUserRef;
  assignee?: EstimateUserRef | null;
  line_items: EstimateLineItem[];
  versions?: EstimateVersion[];
  invoice?: EstimateInvoiceRef | null;
  project?: EstimateProjectRef | null;
}

export interface EstimateAnalytics {
  total_estimates: number;
  draft_count: number;
  sent_count: number;
  approved_count: number;
  rejected_count: number;
  expired_count: number;
  converted_count: number;
  win_rate: number;
  avg_margin_percent: number;
  total_pipeline_value: number;
  total_approved_value: number;
  total_cost: number;
  total_gross_profit: number;
  by_status: { status: EstimateStatus; count: number; total: number }[];
  by_month: { month: string; sent: number; approved: number; rejected: number; value: number }[];
}

export type CreateEstimateLineItemPayload = {
  product_id?: number | null;
  type?: EstimateLineItemType;
  description: string;
  quantity: number;
  unit_cost: number;
  unit_price?: number;
  markup_type?: MarkupType;
  markup_value?: number;
  is_billable?: boolean;
  sort_order?: number;
};

export type CreateEstimatePayload = {
  customer_id?: number | null;
  pipeline_lead_id?: number | null;
  title: string;
  currency?: string;
  discount_type?: DiscountType;
  discount_value?: number;
  tax_rate?: number;
  valid_until?: string | null;
  notes?: string | null;
  terms?: string | null;
  internal_notes?: string | null;
  assigned_to?: number | null;
  line_items: CreateEstimateLineItemPayload[];
};

export type UpdateEstimatePayload = CreateEstimatePayload;

export type RejectEstimatePayload = {
  rejection_reason: string;
};

export type ConvertEstimateResult = {
  estimate: Estimate;
  invoice_id?: number;
  project_id?: number;
};
