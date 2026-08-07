export interface ExpenseCategory {
  id: number;
  business_id: number | null;
  name: string;
  slug?: string;
  description: string | null;
  sort_order: number;
  budget_amount: string | null;
  budget_period: string | null;
  is_system?: boolean;
  created_at: string;
  updated_at: string;
}

export type ExpenseCategoryWithSyncMeta = ExpenseCategory & {
  _pendingSync?: boolean;
  _localId?: string;
};

export interface UserInfo {
  id: number;
  name: string;
  email: string;
}

export interface ExpenseAttachment {
  id: number;
  expense_id: number;
  user_id: number | null;
  type: 'file' | 'link';
  file_name: string;
  file_path: string | null;
  file_url: string | null;
  link_url: string | null;
  mime_type: string | null;
  file_size: number | null;
  created_at: string | null;
}

export interface Expense {
  id: number;
  business_id: number;
  budget_id?: number | null;
  expense_category_id: number | null;
  expense_category?: ExpenseCategory | null;
  recorded_by: number | null;
  recorded_by_user?: { data: UserInfo } | null;
  location_id?: number | null;
  location?: { id: number; name: string; code?: string | null; is_default?: boolean } | null;
  shift_id?: number | null;
  amount: string;
  description: string;
  reference: string | null;
  supplier_tin: string | null;
  supplier_invoice_no: string | null;
  vat_amount: string | null;
  vat_claimable: boolean;
  receipt_url: string | null;
  attachments?: ExpenseAttachment[];
  is_recurring: boolean;
  recurrence_interval: string | null;
  recurrence_end_date: string | null;
  next_due_date: string | null;
  expense_date: string;
  fixed_asset_id?: number | null;
  created_at: string;
  updated_at: string;
}

export type ExpenseWithSyncMeta = Expense & {
  _pendingSync?: boolean;
  _localId?: string;
  _pendingReceipt?: boolean;
};

export interface ExpenseReceiptPayload {
  blob: Blob;
  name: string;
  type: string;
  size: number;
  lastModified?: number;
}

export interface ExpenseFormPayload {
  fields: Record<string, string>;
  receipt?: ExpenseReceiptPayload;
}

export interface CreateExpenseData {
  expense_category_id?: number | null;
  budget_id?: number | null;
  amount: number;
  description: string;
  reference?: string | null;
  supplier_tin?: string | null;
  supplier_invoice_no?: string | null;
  vat_amount?: number | null;
  vat_claimable?: boolean;
  receipt?: File | null;
  is_recurring?: boolean;
  recurrence_interval?: string | null;
  recurrence_end_date?: string | null;
  next_due_date?: string | null;
  expense_date: string;
  shift_id?: number | null;
  location_id?: number | null;
  fixed_asset_id?: number | null;
}

export type UpdateExpenseData = Partial<CreateExpenseData>;

export interface CreateExpenseCategoryData {
  name: string;
  description?: string | null;
  sort_order?: number;
  budget_amount?: number | null;
  budget_period?: string | null;
}

export interface ExpenseSummary {
  total_amount: number;
  total_count: number;
  by_category: {
    category_id: number | null;
    category_name: string;
    total: number;
    count: number;
  }[];
}
